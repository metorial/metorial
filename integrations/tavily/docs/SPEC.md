Now let me fetch the Map endpoint documentation:# Slates Specification for Tavily

## Overview

Tavily is a search engine and web data API designed for AI applications, LLMs, and RAG workflows. It provides web search, content extraction, website crawling, site mapping, and automated research capabilities through a single API. Results are AI-processed to return relevant, structured content rather than raw links.

## Authentication

Tavily uses **API key authentication** exclusively. All endpoints are authenticated via a Bearer token in the `Authorization` header.

- **Method:** API Key (Bearer Token)
- **Header:** `Authorization: Bearer tvly-YOUR_API_KEY`
- **Base URL:** `https://api.tavily.com`
- **Obtaining a key:** Sign up at [app.tavily.com](https://app.tavily.com) to get an API key. Keys are prefixed with `tvly-`.
- **Project tracking (optional):** You can attach a `X-Project-ID` header to organize and track usage across multiple projects under a single API key.

There are no OAuth flows, scopes, or additional credentials required for the standard REST API.

## Features

### Web Search

Perform AI-optimized web searches that aggregate and rank results from multiple sources. Returns relevance-scored results with content snippets, optional LLM-generated answers, and optional image results.

- **Search depth:** Configurable as `ultra-fast`, `fast`, `basic`, or `advanced`, trading off latency for relevance and content richness.
- **Topic categories:** `general`, `news`, or `finance` to tailor result sources.
- **Time filtering:** Filter results by time range (`day`, `week`, `month`, `year`) or specific start/end dates.
- **Domain filtering:** Include or exclude specific domains from results (up to 300 include / 150 exclude).
- **Country boosting:** Prioritize results from a specific country.
- **LLM answer generation:** Optionally include a generated answer (basic or advanced) alongside search results.
- **Raw content:** Optionally retrieve full cleaned HTML content of each result in markdown or plain text.
- **Image search:** Optionally include image results with descriptions.
- **Exact match:** Enforce that results contain exact quoted phrases from the query.
- **Auto parameters:** Let Tavily automatically configure search parameters based on query intent.

### Content Extraction

Extract clean, structured content from one or more specified URLs. Useful for retrieving full page content from known URLs.

- **Single or batch extraction:** Provide one URL or a list of URLs.
- **Extraction depth:** `basic` or `advanced` — advanced retrieves more data including tables and embedded content.
- **Output format:** Content returned in markdown (default) or plain text.
- **Query-based reranking:** Provide a query to rerank extracted content chunks by relevance.
- **Image extraction:** Optionally include images found on the page.
- **Configurable timeout:** Set custom timeouts per request.

### Website Crawling

Traverse a website starting from a root URL, following links across pages with built-in content extraction. Useful for ingesting documentation sites, knowledge bases, or entire domains.

- **Crawl depth and breadth:** Control how deep (up to 5 levels) and how wide (up to 500 links per level) the crawl goes.
- **Natural language instructions:** Guide the crawler with plain-text instructions (e.g., "Find all pages about pricing") to filter relevant pages.
- **Path and domain filtering:** Use regex patterns to include or exclude specific URL paths or domains.
- **External links:** Optionally include or exclude external domain links.
- **Extraction depth:** `basic` or `advanced` for the content extraction step.
- **Page limit:** Set a total cap on the number of pages processed.

### Site Mapping

Discover and list all URLs on a website by traversing its link structure, without extracting content. Returns a flat list of discovered URLs.

- **Depth and breadth controls:** Same traversal controls as crawling (depth up to 5, breadth up to 500).
- **Natural language instructions:** Optionally guide which pages to discover.
- **Path and domain filtering:** Regex-based include/exclude for paths and domains.
- **Page limit:** Cap the total number of links processed.

### Research

Conduct in-depth, multi-step research on a topic. Tavily autonomously performs multiple searches, analyzes sources, and produces a comprehensive research report.

- **Model selection:** Choose `mini` (fast, focused research for narrow questions), `pro` (comprehensive, multi-angle research for complex topics), or `auto`.
- **Structured output:** Provide a JSON Schema to get the research output in a specific structure.
- **Citation formats:** Choose from `numbered`, `mla`, `apa`, or `chicago` citation styles.
- **Streaming:** Optionally stream results via Server-Sent Events as they are generated.
- **Async polling:** Research tasks are queued and can be polled for status/completion.

### Usage Tracking

Retrieve API credit usage information to monitor consumption across your account.

## Events

The provider does not support events.
