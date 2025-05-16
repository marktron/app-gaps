'use client';

import { useState } from 'react';

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

interface AnalysisResponse {
  themes: Theme[];
  prioritizedThemes: PrioritizedTheme[];
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [prioritizedThemes, setPrioritizedThemes] = useState<PrioritizedTheme[]>([]);

  const isValidUrl = (url: string) => {
    const regex = /^https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/.+\/id(\d+)/;
    return regex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidUrl(url)) {
      setError('Please enter a valid App Store URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setThemes([]);
    setPrioritizedThemes([]);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze reviews');
      }

      const data = await response.json();
      console.log('🔔 Received data:', data);

      if (!data.themes || !Array.isArray(data.themes)) {
        throw new Error('Invalid response format: missing themes array');
      }

      setThemes(data.themes);
      setPrioritizedThemes(data.prioritizedThemes || []);
    } catch (err) {
      console.error('🚨 Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High':
        return 'text-red-600';
      case 'Medium':
        return 'text-yellow-600';
      case 'Low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            App Store Review Insights
          </h1>
          <p className="text-gray-600">
            Analyze App Store reviews to discover unmet user needs
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste an iOS App Store URL"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={isLoading || !url}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </form>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Analyzing reviews...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results */}
        {themes.length > 0 && (
          <div className="space-y-8">
            {/* Prioritized Themes */}
            <div className="bg-white text-gray-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Prioritized Themes</h2>
              <ol className="list-decimal list-inside space-y-2">
                {prioritizedThemes.map((theme, index) => (
                  <li key={index} className="text-gray-700">
                    {theme.title} <span className={`font-medium ${getImpactColor(theme.impact)}`}>({theme.impact})</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Detailed Themes */}
            <div className="space-y-6">
              {themes.map((theme, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg text-gray-900 font-semibold mb-3">{theme.title}</h3>
                  <div className="space-y-3">
                    <p className="text-gray-700">{theme.summary}</p>
                    <blockquote className="border-l-4 border-gray-200 pl-4 italic text-gray-600">
                      {theme.quote}
                    </blockquote>
                    <p className={`font-medium ${getImpactColor(theme.impact)}`}>
                      Impact: {theme.impact}
                    </p>
                    <p className="font-medium text-gray-900 mb-2">
                      Potential Feature: {theme.feature}
                    </p>
                    {/* <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Potential Feature:</h4>
                      <p className="text-gray-700">{theme.feature}</p>
                    </div> */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
