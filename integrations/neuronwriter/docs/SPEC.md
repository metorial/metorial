Let me fetch the official API documentation page for more details.# Slates Specification for Neuronwriter

## Overview

NeuronWriter is a content optimization tool that uses semantic SEO and NLP algorithms to analyze top-performing content and provide actionable recommendations for keyword usage, content structure, and readability. It offers AI-assisted writing capabilities, competitor analysis, and content scoring to help users create search-engine-optimized content.

## Authentication

NeuronWriter uses API key authentication. Each request to the API must include the `X-API-KEY` HTTP header with the user's Neuron API key.

To obtain an API key:

1. Log into your NeuronWriter account, click your profile icon > "Profile" > "Neuron API Access", and click "Generate New API Key" and copy it.

This feature requires a Gold plan or higher.

**Base URL:** `https://app.neuronwriter.com/neuron-api/0.5/writer`

All API methods use POST requests unless specified otherwise.

Some operations also require a **Project ID**, which can be found in the project's URL (e.g., `https://app.neuronwriter.com/project/view/{ProjectID}/optimisation`).

## Features

### Project Management

List all projects within the account, including their name, language, and associated search engine. Projects serve as the organizational unit for grouping keyword queries.

### Query Creation and SEO Recommendations

Add new queries in bulk and retrieve share URLs, and integrate NeuronWriter recommendations into your content generation process. When creating a new query, you specify a project, keyword, search engine (e.g., `google.co.uk`), and content language. After creating a new query, it usually takes around 60 seconds until recommendations are prepared.

Recommendations include:

- **Content metrics:** Target word count and readability scores based on SERP median values.
- **Term suggestions:** Recommended keywords and phrases for title, meta description, headings (H1, H2), and body content, with usage frequency ranges based on competitor analysis.
- **Entity recommendations:** Relevant named entities with importance and relevance scores.
- **Content ideas:** Suggested questions (autocomplete suggestions, People Also Ask, and questions extracted from competing content).
- **Competitor data:** SERP competitor URLs, titles, and content scores.

Configurable parameters include keyword, language, search engine, and project. Results can be filtered by status, source, creation date, tags, and other criteria.

### Content Management

- **Retrieve content:** Fetch the last saved content revision (HTML, title, meta description) for any query, with the option to include autosave revisions.
- **Import content:** Update editor content for a query by providing raw HTML or a URL to auto-import from. Optional parameters allow specifying the title, meta description, and HTML container selectors (id or class) for URL imports.

### Content Evaluation

Evaluate content against NeuronWriter's SEO scoring without saving it. Accepts the same inputs as content import (HTML or URL) and returns a content score indicating optimization level.

- Useful for validating content before publishing or for scoring externally generated content.

### Shareable URLs

When a query is created, NeuronWriter returns multiple access URLs:

- A direct query URL for account holders.
- A share URL with edit and save access.
- A read-only preview URL.

These enable collaboration with writers or clients who may not have NeuronWriter accounts.

## Events

The provider does not support events. NeuronWriter's API does not offer webhooks or any built-in event subscription mechanism.
