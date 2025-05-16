# Product Requirements Document
**Project:** App Store Review Insights  
**Owner:** Product Team  
**Version:** 1.0  
**Date:** 2025-05-15

---

## 1. Purpose & Scope
Build a lightweight Next.js web app that:
1. Accepts an iOS App Store URL.
2. Fetches up to 500 most-recent US reviews via Apple’s public RSS feeds.
3. Submits the collected reviews to OpenAI’s ChatGPT API.
4. Parses ChatGPT’s response to surface “unmet user needs” as potential startup ideas.

**Out of scope:**
- Authenticated App Store Connect API integration (requires ownership)
- Persistent storage or user accounts
- Production-grade UI styling beyond basic usability

---

## 2. Goals & Success Criteria
- **Functionality:** Junior engineer can deliver end-to-end flow in 1–2 s for common cases.
- **Reliability:** Handle invalid URLs, empty reviews, and API errors gracefully.
- **Maintainability:** Clear code structure, well-documented, minimal external dependencies.
- **Extensibility:** Easy to swap Apple RSS logic for App Store Connect API in the future.

---

## 3. User Stories

| ID  | Role             | Story                                                                                  | Acceptance Criteria                                                                                       |
|-----|------------------|----------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| US1 | Any visitor      | As a visitor, I want to paste an App Store URL so the system knows which app to query | - Input field accepts valid App Store URLs<br>- Invalid URLs show inline error message                    |
| US2 | Any visitor      | As a visitor, I want up to 500 US reviews fetched automatically                        | - System issues 10 RSS feed requests (page=1…10)<br>- Aggregates textual reviews only (omits ratings-only) |
| US3 | Any visitor      | As a visitor, I want ChatGPT to analyze those reviews and list unmet needs            | - Frontend shows loading state during analysis<br>- Displays a structured list of unmet needs             |
| US4 | Any visitor      | As a visitor, I want to see error feedback if external APIs fail                      | - Errors from RSS or OpenAI return user-friendly messages<br>- “Retry” button available                   |

---

## 4. Functional Requirements

### 4.1 Frontend
- **Page Layout**
  - **Header:** App title, brief description.
  - **Form:** Single input for App Store URL + “Analyze” button.
  - **Results Area:**
    - Loading spinner / progress indicator.
    - List of unmet needs returned by ChatGPT (bulleted or numbered).
    - Error box for issues.

- **Validation**
  - Regex check for URLs matching `^https:\/\/apps\.apple\.com\/[a-z]{2}\/app\/.+\/id(\d+)`
  - Disable “Analyze” until URL is valid.

### 4.2 Backend (API Routes)
- **Route:** `POST /api/analyze`
  - **Input:** `{ url: string }`
  - **Process:**
    1. Extract `appId` from URL.
    2. For `page` in `1…10`:
       - Fetch `https://itunes.apple.com/us/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`
       - Parse JSON, collect `entry` arrays (skip page if no entries).
    3. Concatenate up to 500 reviews’ `content` fields.
    4. Build prompt for ChatGPT:
       ```
       You are a product strategist. Given these user reviews, identify 5–7 key unmet needs or pain points that could inspire a startup. Reviews: “...”
       ```
    5. Call OpenAI Chat Completions API with model `gpt-4o-mini` (or chosen).
    6. Return the parsed list to frontend.

- **Error Handling:**
  - Non-200 from RSS → log & return `503: “Unable to fetch reviews”`.
  - OpenAI errors → `502: “Analysis service unavailable”`.
  - Timeouts → `504: “Request timed out, please retry”`.

---

## 5. Technical Architecture

```
[Browser]
   └─ POST /api/analyze ──> [Next.js API Route]
                                ├─ Fetch Apple RSS x10
                                ├─ Aggregate Reviews
                                └─ OpenAI Chat Completion
                                      ↓
                            JSON { unmetNeeds: string[] }
                                      ↓
                                [Browser UI]
```

- **Framework:** Next.js 14+ (App Router or Pages Router).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS (minimal).
- **Environment Variables:**
  - `OPENAI_API_KEY`
  - (Optional) `APPLE_RSS_USER_AGENT` to set custom UA header.

---

## 6. Data Flow & Security
- **Review Fetching:** Public RSS—no credentials required.
- **OpenAI Integration:**
  - Server-side only.
  - Don’t expose API key to client.
- **Rate Limits:**
  - Apple RSS: throttle to avoid 429s (e.g. 100 ms between requests).
  - OpenAI: respect throughput (handle 429 with exponential backoff).

---

## 7. UI/UX Wireframes

1. **Landing Form**
   ```
   +---------------------------------------+
   | [App Logo] Review Insights Analyzer   |
   | Paste an iOS App Store URL:          |
   | [__________________________][Analyze] |
   +---------------------------------------+
   ```

2. **Loading State**
   ```
   Fetching reviews... [spinner]
   Analyzing with AI... [spinner]
   ```

3. **Results List**
   ```
   Unmet user needs for “Strava”:
   1. Need for offline route editing…
   2. Frustration with…
   …etc.
   [New analysis] [Change App URL]
   ```

4. **Error State**
   ```
   ❌ Unable to fetch reviews. Please check the App URL or try again.
   [Retry]
   ```

---

## 8. Milestones & Timeline

| Week | Deliverable                                   |
|------|-----------------------------------------------|
| 1    | Project setup, URL parser, basic form + validation |
| 2    | API route: fetch & aggregate RSS reviews      |
| 3    | Integrate OpenAI call, basic prompt & response |
| 4    | UI for results, loading/error states          |
| 5    | End-to-end testing, error-handling, cleanup   |

---

## 9. Acceptance Criteria
- **All core flows** (valid URL → results) pass end-to-end manual testing.
- **Unit tests** cover URL parser, RSS fetcher stub, error branches.
- **API key** securely consumed and not leaked client-side.
- **Documentation**: README with setup, env vars, running dev & prod builds.

---

## 10. Future Enhancements
- Swap RSS feeds for App Store Connect API (`customerReviews` endpoint).
- Persist reviews & analyses in a database (Postgres).
- User authentication & history of analyses.
- Support multiple countries & language filters.
- UI refinement & theming.
