Now let me check for sandboxes and recordings features that appeared in the nav:# Slates Specification for Hyperbrowser

## Overview

Hyperbrowser is a cloud-based browser-as-a-service platform that provides scalable headless browser infrastructure for AI agents and web automation. It provides instant, scalable browser infrastructure with built-in CAPTCHA solving, proxy management, and anti-bot detection, used by developers to power AI agents for data collection, testing, and web automation at scale.

## Authentication

Hyperbrowser uses API key authentication. To use Hyperbrowser, you need an API key, which can be obtained from the Hyperbrowser dashboard at `https://app.hyperbrowser.ai/`. The API key should be stored as `HYPERBROWSER_API_KEY`.

All API requests are authenticated by passing the API key in the `x-api-key` header:

```
x-api-key: YOUR_API_KEY
```

The base URL for all API requests is `https://api.hyperbrowser.ai`.

## Features

### Browser Session Management

The API offers methods to create new sessions, get session details, stop sessions, and more. Sessions can be connected to via Playwright, Puppeteer, or Selenium using WebSocket or CDP endpoints. Sessions support configurable parameters including:

- **Stealth mode**: Anti-bot detection avoidance.
- **Proxy configuration**: Built-in rotating residential proxies with country/state/city targeting, or bring your own proxy server.
- **CAPTCHA solving**: Automatic CAPTCHA resolution during sessions.
- **Ad/tracker blocking**: Block ads, trackers, and annoyances.
- **Browser fingerprinting**: Configure OS, device type, browser platform, locale, and screen resolution.
- **Timeout**: Configurable session duration.
- Proxy usage and CAPTCHA solving require being on a paid plan.

### Browser Profiles

A profile is a saved snapshot of a browser's user data directory. By default, each session uses a fresh user data directory. When you create a profile and persist it, Hyperbrowser saves the session's user data directory, and you can attach the profile to future sessions. This enables maintaining login state, cookies, and other browser data across sessions. Profiles can be created, listed, and deleted via the API.

### Web Scraping

The Scrape API allows you to get data from web pages with a single call. You can scrape page content and capture it in various formats like markdown or HTML. Output can also include links, metadata, and screenshots. Batch scraping of multiple URLs is supported in a single job.

### Web Crawling

The Crawl API allows you to crawl through an entire website and get all its data with a single call. Crawling starts from a given URL and follows links to subpages. Configurable options include maximum number of pages, output formats (markdown, HTML, links), and all session options (proxy, stealth, CAPTCHA solving).

### Structured Data Extraction

Hyperbrowser's extraction capabilities use AI to pull specific information from webpages according to a defined schema, transforming unstructured web content into structured data that matches exact requirements. You provide URLs, a natural language prompt, and optionally a JSON schema describing the desired output structure. The `maxLinks` parameter controls how many linked pages to follow.

### AI Browser Agents

Hyperbrowser provides multiple AI agent types that accept natural language task descriptions and autonomously operate a browser to complete them:

- **Browser Use**: Fast, lightweight browser automation with the Browser Use agent. Supports multiple LLMs (GPT-4o, Claude, Gemini). Configurable options include vision mode, max steps, max failures, planner LLM, and initial actions.
- **Claude Computer Use**: Complex browser tasks using Claude's computer use capabilities.
- **OpenAI CUA**: General-purpose automation using OpenAI's Computer-Using Agent model.
- **Gemini Computer Use**: Browser automation using Google's Gemini model.
- **HyperAgent**: An AI-native browser automation framework — Playwright supercharged with AI. Provides simple APIs like `page.ai()`, `page.extract()` and `executeTask()` for any AI automation, with fallback to regular Playwright when AI isn't needed.

All agent tasks return step-by-step results and a final output, and can use custom API keys for the underlying LLM providers.

### Session Recordings

Recording captures all browser interactions, DOM changes, and network requests for the duration of a session. Two types are available:

- **rrweb recordings**: DOM-based replay recordings (enabled by default).
- **Video recordings (MP4)**: Screen capture video requiring explicit opt-in via `enableVideoWebRecording`.

Recording URLs can be retrieved after a session is stopped.

### Live View

Hyperbrowser's Live View allows you to observe and interact with browser sessions in real-time. It can be used to debug scripts, monitor long-running automations, provide end-user browser interaction, and perform human-in-the-loop workflows. The live view URL can be embedded in web applications via iframe.

### Browser Extensions

Hyperbrowser allows you to enhance browser sessions with custom Chrome extensions. Extensions are uploaded as ZIP archives and can then be attached to any session by referencing their ID.

### File Downloads

Files downloaded during a browser session can be retrieved via the API after the session completes.

### Web Search

A built-in Bing search capability allows querying the web and retrieving results directly through the API.

## Events

The provider does not support events. There is no webhook or event subscription mechanism in Hyperbrowser's API. All operations (scrape, crawl, extract, agent tasks) use an asynchronous job model where you start a job and poll for its status and results.
