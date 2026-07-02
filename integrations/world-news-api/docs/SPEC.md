# Slates Specification for World news api

## Overview

World News API is a REST API that provides access to thousands of news sources in over 86 languages from over 210 countries. It offers semantically tagged news articles with sentiment analysis, geo-location tagging, and entity extraction, enabling search and retrieval of both real-time and historical news content.

## Authentication

World News API uses **API key** authentication. Users sign up for a free account at [worldnewsapi.com/console](https://worldnewsapi.com/console) and obtain an API key from their profile dashboard.

The API key can be provided in one of two ways:

1. **Query parameter**: Append `?api-key=YOUR-API-KEY` to the request URL.
   - Example: `https://api.worldnewsapi.com/search-news?api-key=YOUR-API-KEY&text=tesla`
2. **Request header**: Include the key in the `x-api-key` HTTP header.

No OAuth or additional scopes are required. The API key alone controls access and quota.

## Features

### News Search

Search and filter news articles by text keywords, date range, location, category, language, source country, author, news source, and sentiment range. Supports semantic search for entities (e.g., searching `Location:USA` matches "US", "United States", etc.), text matching, phrase matching, and word exclusions. Results include title, full text, summary, image, video, publish date, authors, category, language, source country, and sentiment score. Sorting can be done by relevance or publish time.

### Top News / Breaking News

Retrieve the most relevant clustered headlines for a specific country, language, and date. News articles are grouped into clusters ranked by the number of sources covering the same story, giving an overview of the day's most important stories.

### Newspaper Front Pages

Retrieve images of front pages from over 6,000 newspaper publications across 125+ countries. Can be filtered by source name, country, and date. Useful for getting a visual snapshot of what matters in a given country on a given day.

### Retrieve Specific News Article

Fetch the full details of a specific news article by its ID, including title, text, summary, images, videos, authors, publish date, sentiment, and category.

### News Extraction

Extract structured news data from any given URL. Returns the article's title, full text, images (with captions and dimensions), videos (with summary, duration, thumbnail), publish date, authors, language, and sentiment. Optionally performs named entity analysis on the article content.

### Extract News Links

Extract news article links from a given news source URL, useful for discovering articles on a particular website.

### News Source Discovery

Search for available news sources by name, country, or language. Users can also suggest new news sources to be added to the index.

### Website to RSS Feed

Convert any news website into an RSS feed, enabling RSS-based consumption of news from sources that may not natively provide an RSS feed.

### Geo Coordinates Lookup

Retrieve geographic coordinates for a given location name, supporting the geo-based news search feature.

### Sentiment Analysis

News articles (currently limited to English and German) are analyzed with AI-based sentiment classifiers, assigning a score between -1 (negative) and +1 (positive). Articles can be filtered by minimum and maximum sentiment values during search.

### Geo-Located News Search

News articles are tagged with mentioned locations, allowing search by geographic coordinates and radius (e.g., all news mentioning locations within 15km of a given point).

## Events

The provider does not support events. World News API is a request-response REST API with no webhook or event subscription mechanism.
