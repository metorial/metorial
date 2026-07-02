Now let me fetch the webhook help page and the API docs page for more details:Now I have enough information to write the specification.

# Slates Specification for Listen Notes

## Overview

Listen Notes is a podcast search engine and database that provides a REST API for searching, browsing, and retrieving metadata for millions of podcasts and episodes. The API powers use cases such as podcast player apps, content curation, podcast advertising platforms, and market intelligence tools.

## Authentication

Listen Notes uses API keys for authentication. Each API request must include the API key via the HTTP header `X-ListenAPI-Key`.

- **Type:** API Key
- **Header:** `X-ListenAPI-Key`
- **Obtaining a key:** Sign up at the Listen Notes API website and retrieve your API key from the [API Dashboard](https://www.listennotes.com/api/dashboard/).
- **Base URL (Production):** `https://listen-api.listennotes.com/api/v2`
- **Base URL (Test/Mock):** You can use the API in test mode, which returns fake data for testing purposes and does not need an API key. To use the test mode, change the base URL to `https://listen-api-test.listennotes.com/api/v2`.

Example request:

```
curl -X GET \
  'https://listen-api.listennotes.com/api/v2/best_podcasts?genre_id=93&page=2' \
  -H 'X-ListenAPI-Key: <YOUR_API_KEY>'
```

No OAuth or other authentication methods are supported. There are no scopes or additional credentials required.

## Features

### Podcast & Episode Search

Search all publicly accessible podcasts and episodes on the Internet by keywords. Full-text search supports filtering by language, genre, region, publish date, and sort order. You can search across episode titles, descriptions, and podcast-level metadata. A typeahead API provides search-as-you-type suggestions. Related search term suggestions and spelling correction are available on PRO and ENTERPRISE plans. You can also fetch trending search terms from the platform.

### Podcast & Episode Metadata Retrieval

Fetch detailed metadata for podcasts and episodes, including title, description, publisher, genre, RSS feed URL, audio URLs, images, and cross-platform links (Spotify, YouTube, Apple Podcasts, etc.). You can fetch up to 10 podcasts in a single request using Listen Notes IDs, RSS URLs, or iTunes IDs.

### Podcast Discovery & Recommendations

Get recommendations for podcasts and episodes. Browse curated "best podcasts" lists by genre with configurable sort orders. Discover similar podcasts to a given show. Access hot/trending podcasts and curated podcast lists from the community and media.

### Episode Transcripts

The episode detail endpoint can return a transcript field if the `show_transcript=1` parameter is provided. Less than 1% of episodes have transcripts in the database, as these come from podcast creators who provide them. Available on PRO/ENTERPRISE plans only.

### Playlist Management

Fetch a playlist's info and items (episodes or podcasts), and fetch a list of your playlists. Playlists allow organizing collections of podcasts and episodes.

### Podcast Submission

Submit an RSS URL to Listen Notes to add new podcasts to the database. If the RSS URL already exists, the endpoint returns metadata immediately; otherwise, the podcast is reviewed and added within 12 hours. This is primarily used by podcast hosting services.

### Podcast Deletion

You can redirect content removal requests to Listen Notes via a delete endpoint to handle content deletion for compliance purposes.

### Cross-Platform Lookup

Look up podcasts using Apple Podcasts/iTunes IDs to find corresponding Listen Notes metadata. This enables importing podcast data from other platforms.

### Genre & Language Directory

Browse the full taxonomy of podcast genres and supported languages/regions for filtering search and discovery results.

## Events

Listen Notes provides limited webhook support for specific events related to podcast management.

### Podcast Submission Events

- **Description:** When an event is triggered (e.g., a podcast submission is accepted), Listen Notes sends a POST request to a webhook URL provided by you, which is expected to respond with status code 200.
- **Configuration:** Webhooks are set up via the "WEBHOOKS" tab in the API dashboard.
- **Supported triggers:** Podcast submission accepted (via `POST /podcasts/submit`) and podcast deletion (via `DELETE /podcasts/{id}`). These are primarily intended for podcast hosting services managing submissions on behalf of podcasters.

Note: Listen Notes does not provide general-purpose webhook notifications for broader events like new episode availability or podcast metadata changes.
