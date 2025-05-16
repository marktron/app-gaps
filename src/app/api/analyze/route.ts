import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Review {
  author: {
    uri: { label: string };
    name: { label: string };
    label: string;
  };
  updated: { label: string };
  'im:rating': { label: string };
  'im:version': { label: string };
  id: { label: string };
  title: { label: string };
  content: {
    label: string;
    attributes: { type: string };
  };
  link: {
    attributes: {
      rel: string;
      href: string;
    };
  };
  'im:voteSum': { label: string };
  'im:contentType': { attributes: { term: string; label: string } };
  'im:voteCount': { label: string };
}

interface Theme {
  title: string;
  summary: string;
  quote: string;
  impact: 'High' | 'Medium' | 'Low';
  feature: string;
}

interface PrioritizedTheme {
  title: string;
  impact: 'High' | 'Medium' | 'Low';
}

interface RSSResponse {
  feed: {
    entry: Review[];
  };
}

// Constants
const MAX_REVIEWS = 100;
const MAX_TOKENS_PER_REVIEW = 1000;
const MAX_TOTAL_TOKENS = 6000;
const RSS_PAGES = 10;
const RSS_DELAY_MS = 100;
const MAX_REVIEWS_TOTAL = 500;

// Error types
class AppError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class APIConnectionError extends AppError {
  constructor(message: string) {
    super(message, 503);
    this.name = 'APIConnectionError';
  }
}

// Helper function to estimate tokens (rough approximation)
function estimateTokens(text: string): number {
  // Average of 4 characters per token
  return Math.ceil(text.length / 4);
}

// Helper function to truncate text to a maximum number of tokens
function truncateToTokens(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) return text;
  
  // Truncate to approximately maxTokens
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars) + '...';
}

async function fetchReviewsPage(appId: string, page: number): Promise<Review[]> {
  const url = `https://itunes.apple.com/us/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': process.env.APPLE_RSS_USER_AGENT || 'AppStoreReviewAnalyzer/1.0',
      },
    });

    if (!response.ok) {
      console.error(`🚨 Failed to fetch page ${page}: ${response.status}`);
      return [];
    }

    const data: RSSResponse = await response.json();
    return data.feed?.entry || [];
  } catch (error) {
    console.error(`🚨 Error fetching page ${page}:`, error);
    return [];
  }
}

async function analyzeReviewsWithGPT(reviews: string[]): Promise<{ themes: Theme[], prioritizedThemes: PrioritizedTheme[] }> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new ValidationError('OpenAI API key is not configured');
    }

    // Process reviews to fit within token limits
    const processedReviews = reviews
      .slice(0, MAX_REVIEWS)
      .map(review => truncateToTokens(review, MAX_TOKENS_PER_REVIEW));

    // Calculate total tokens in processed reviews
    const totalReviewTokens = processedReviews.reduce((sum, review) => sum + estimateTokens(review), 0);
    console.log(`🔔 Total tokens in reviews: ${totalReviewTokens}`);

    // Check if we're within the total token limit
    if (totalReviewTokens > MAX_TOTAL_TOKENS) {
      console.warn(`⚠️ Total tokens (${totalReviewTokens}) exceeds limit (${MAX_TOTAL_TOKENS}), truncating reviews`);
      // Keep reducing reviews until we're under the limit
      while (totalReviewTokens > MAX_TOTAL_TOKENS && processedReviews.length > 0) {
        processedReviews.pop();
      }
    }

    console.log(`🔔 Processing ${processedReviews.length} reviews (truncated to ${MAX_TOKENS_PER_REVIEW} tokens each)`);

    const prompt = `I want to explore unmet needs and potential business opportunities based on competitors in the App Store. Analyze these App Store reviews and provide insights in the following JSON format. When doing the analysis, put an emphasis on topics that suggest potential for a new entrant in the market, and less of an emphasis on minor issues like customer service or minor UI complaints. Return ONLY the JSON object, with no additional text or explanations:

{
  "themes": [
    {
      "title": "string",
      "summary": "string",
      "quote": "string",
      "impact": "High|Medium|Low",
      "feature": "string"
    }
  ],
  "prioritizedThemes": [
    {
      "title": "string",
      "impact": "High|Medium|Low"
    }
  ]
}

Requirements:
- Return 3-5 themes
- Each theme must have all fields filled
- Impact must be exactly "High", "Medium", or "Low"
- Prioritized themes should be ordered by impact (High first)
- Return ONLY the JSON object, with no additional text or explanations
- Ensure the response is valid JSON that can be parsed

Reviews:
${processedReviews.join('\n\n')}`;

    const estimatedTokens = estimateTokens(prompt);
    console.log(`🔔 Estimated tokens in prompt: ${estimatedTokens}`);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert product strategist and startup advisor with experience launching consumer-facing mobile apps. You must respond with a valid JSON object in the exact format specified, with no additional text or explanations. The response must be parseable JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    console.log('🔔 Received response from OpenAI');

    const response = completion.choices[0]?.message?.content || '';
    
    try {
      // Clean the response to ensure it's valid JSON
      const cleanedResponse = response.trim().replace(/^```json\n?|\n?```$/g, '');
      const parsedResponse = JSON.parse(cleanedResponse);
      console.log('🔔 Parsed JSON response:', parsedResponse);
      
      return {
        themes: parsedResponse.themes || [],
        prioritizedThemes: parsedResponse.prioritizedThemes || []
      };
    } catch (error) {
      console.error('🚨 Error parsing JSON response:', error);
      console.error('🚨 Raw response:', response);
      throw new ValidationError('Failed to parse analysis response');
    }
  } catch (error) {
    console.error('🚨 Error analyzing reviews with GPT:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new APIConnectionError('Failed to analyze reviews');
  }
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    // Extract app ID from URL
    const match = url.match(/\/id(\d+)/);
    if (!match) {
      throw new ValidationError('Invalid App Store URL');
    }

    const appId = match[1];
    console.log('🔔 Processing app ID:', appId);
    
    const allReviews: Review[] = [];
    
    // Fetch reviews from pages 1-10
    for (let page = 1; page <= RSS_PAGES; page++) {
      console.log(`🔔 Fetching page ${page}`);
      const reviews = await fetchReviewsPage(appId, page);
      
      if (reviews.length === 0) {
        console.log(`🔔 No more reviews found on page ${page}`);
        break;
      }

      allReviews.push(...reviews);
      console.log(`🔔 Found ${reviews.length} reviews on page ${page}`);

      // Stop if we have enough reviews
      if (allReviews.length >= MAX_REVIEWS_TOTAL) {
        allReviews.length = MAX_REVIEWS_TOTAL;
        console.log('🔔 Reached reviews limit');
        break;
      }

      // Add a small delay between requests to avoid rate limiting
      if (page < RSS_PAGES) {
        await new Promise(resolve => setTimeout(resolve, RSS_DELAY_MS));
      }
    }

    console.log(`🔔 Total reviews collected: ${allReviews.length}`);

    // Extract just the content text from the reviews
    const reviewContents = allReviews
      .map(review => {
        const rating = review['im:rating']?.label || '0';
        const title = review.title?.label || '';
        const content = review.content?.label || '';
        return `[Rating: ${rating}/5] ${title}\n${content}`;
      })
      .filter((content): content is string => typeof content === 'string' && content.length > 0);

    console.log(`🔔 Extracted ${reviewContents.length} review contents`);

    // Analyze reviews with GPT
    const analysis = await analyzeReviewsWithGPT(reviewContents);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('🚨 Error processing request:', error);
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, themes: [], prioritizedThemes: [] },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to process request', themes: [], prioritizedThemes: [] },
      { status: 500 }
    );
  }
} 