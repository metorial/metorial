# Slates Specification for Giphy

## Overview

GIPHY is a GIF search engine and hosting platform that provides access to a library of millions of GIFs, stickers, clips, and animated emoji. The GIPHY API is a set of endpoints for fetching and displaying GIFs, Stickers, and other GIPHY content in your app. It also supports uploading GIF and video content to GIPHY channels.

## Authentication

GIPHY uses **API Key** authentication. The Giphy API requires API key authentication for all requests. You can pass your API key as a query parameter in your API requests, or you can include it in the request headers.

To obtain an API key:

1. Create a GIPHY API Key by clicking "Create an API Key" on the Developer Dashboard (you need to create an account first).
2. The API key is passed as a query parameter `api_key` on each request. For example: `https://api.giphy.com/v1/gifs/trending?api_key=YOUR_API_KEY`
3. Create separate keys for each platform (iOS, Android, Web) and section. If you're using a GIPHY integration in different sections of your app, GIPHY requires that each use of our service be delineated by a different key for each section per platform.

All keys start as beta keys. If you need more than 100 API calls per hour you will need to upgrade your API Key to production status via your dashboard.

## Features

### GIF and Sticker Search

Search GIPHY's library of millions of GIFs and stickers by entering a word or phrase. GIPHY Search gives you instant access to our library of millions of GIFs and Stickers by entering a word or phrase. With our unparalleled search algorithm, users can easily express themselves and animate their conversations.

- Supports filtering by content rating (g, pg, pg-13, r).
- Supports language parameter for multilingual search.
- Returns multiple renditions of each result in various sizes and formats (MP4, WEBP, GIF).

### Trending Content

GIPHY Trending returns a list of the most relevant and engaging content each and every day. Our feed of trending content is continuously updated, so you always have the latest and greatest at your fingertips.

- Available for both GIFs and stickers.
- Can be filtered by content rating.

### Translate (Word-to-GIF)

GIPHY Translate converts words and phrases to the perfect GIF or Sticker using GIPHY's special sauce algorithm. This feature is best exhibited in GIPHY's Slack integration.

- Returns a single GIF or sticker that best matches the input text.

### Random GIF

GIPHY Random lets you add some weirdness to the conversation by returning a single random GIF or Sticker related to the word or phrase entered. If no tag is specified, the GIF or Sticker returned is completely random.

### Retrieve GIFs by ID

Fetch specific GIF or sticker objects by their unique GIPHY ID. Supports fetching a single GIF or multiple GIFs by providing an array of IDs.

### Animated Emoji

GIPHY has released a feature across all GIPHY apps and platforms that makes GIPHY's uniquely diverse emoji library more accessible than ever. Pairing custom artwork with a purpose-built API endpoint, GIPHY emojis allow you to bring animated reaction emojis to your users with style and ease.

- If the `variation_count` value is populated with a number greater than 0, it indicates that the emoji has some number of variations. These variations represent different stylings or skin tones for that emoji.

### Search Discovery Tools

- **Trending Searches**: Returns a set of search terms that are "trending" across the GIPHY network. These results are updated hourly, and are sourced from both humans and algorithms.
- **Search Suggestions**: Returns a set of related search queries for a given query.
- **Autocomplete**: Returns a list of searches matching a given string of characters. While there are many ways to utilize this endpoint, one of the most useful means is for search query autocomplete.
- **Categories**: Returns the list of high-level content categories and their respective subcategories, which we use to classify our GIF content.

### Upload

The documentation describes how to upload animated GIFs or videos to Giphy.com using the API. You can use the endpoint to upload your content, attach tags and other meta tag in a single HTTP or HTTPS POST request.

- Accepts a local file or a source URL.
- Supports tagging content and specifying a source URL.
- Production Upload keys require a Giphy Channel Username to upload, host, and post content to.
- Files up to 100MB are supported.

### Clips (GIFs with Sound)

Access to Clips endpoints is only available upon approval. Please reach out to clips@giphy.com to request permission.

- Supports search and trending for short video clips with audio.
- Can be filtered by content rating and rendition bundles.

### Analytics / Action Register

The GIPHY Action Register endpoint registers each time a user views, clicks, or sends a GIF or Sticker, helping GIPHY improve your users' search results.

- Tracks user interactions (view, click, send) to personalize future results.

## Events

The provider does not support events. GIPHY's API is read-oriented (search, trending, random) and write-oriented (upload, analytics) but does not offer webhooks or event subscription mechanisms.
