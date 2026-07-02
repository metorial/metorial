Now let me get more details on the fetch endpoint and source filtering:Now let me check if there's a fetch endpoint and credit balance endpoint:I now have enough information to write the specification. Note: There are two different products called "Linkup" — one is linkup.so (AI search API) and the other is linkupapi.com (LinkedIn/WhatsApp automation). Based on the context of the query asking about "Linkup" as a provider, and given that linkup.so is the more prominent and well-known API product, I'll focus on Linkup (linkup.so).

# Slates Specification for Linkup

## Overview

Linkup (linkup.so) is a web search API designed for AI applications. It allows developers to retrieve real-time web content based on natural language queries, providing factual grounding data for LLMs and AI agents. It offers both fast standard search and comprehensive deep search with agentic workflows.

## Authentication

Linkup uses API key authentication.

1. Create a Linkup account for free to get your API key.
2. Your API key needs to be sent along all your requests as a Bearer token in the Authorization header.

**Base URL:** The Linkup API can be accessed using the base URL: `https://api.linkup.so/v1`.

**Header format:**

```
Authorization: Bearer <YOUR_LINKUP_API_KEY>
```

There are no OAuth flows, scopes, or additional credentials required. A single API key is all that is needed.

## Features

### Web Search

The `/search` endpoint allows you to discover and access relevant web content based on a natural language query. Once the content is retrieved, it can serve as factual grounding for Large Language Models (LLMs), helping them produce more accurate and informed responses.

- **Depth modes:**
  - `standard`: Returns results more quickly, suitable for low-latency scenarios.
  - `deep`: Continues to search iteratively if it doesn't find sufficient information on the first attempt. This may take longer, but often yields more comprehensive results.

- **Output types:**
  - `sourcedAnswer`: Returns a natural language answer with source attributions.
  - `searchResults`: Provides chunks of contextual data suitable for grounding in LLM prompts.
  - `structured`: Produces a response following a specified JSON schema, ideal for structured data extraction. Requires providing a `structuredOutputSchema` parameter defining the desired JSON schema.

- **Filtering options:**
  - `fromDate` / `toDate`: Filter results by date range (format: YYYY-MM-DD). `includeDomains` / `excludeDomains`: Filter results to include or exclude specific domains.
  - `maxResults`: The maximum number of results to return.
  - `includeImages`: Defines whether the API should include images in its results.
  - `includeInlineCitations`: Relevant only when outputType is `sourcedAnswer`. Defines whether the answer should include inline citations.
  - `includeSources`: Specifically designed for use with the structured output type. When enabled, it modifies the schema of the structured response to include source information alongside your custom data structure.

### Web Page Fetching

The `/fetch` endpoint allows you to fetch a single webpage from a given URL. The response includes the clean markdown version of the webpage.

- **Parameters:**
  - `url` (required): The URL of the webpage to fetch.
  - `includeRawHtml`: Defines whether the API should include the raw HTML of the webpage in its response.
  - `renderJs`: Defines whether the API should render the JavaScript of the webpage. Useful for dynamic pages but makes requests slower.
  - `extractImages`: Defines whether the API should extract the images from the webpage in its response.

### Credit Balance

The API provides an endpoint to check your remaining account credit balance (`GET /credits/balance`).

## Events

The provider does not support events. Linkup is a stateless search and content retrieval API with no webhook or event subscription capabilities.
