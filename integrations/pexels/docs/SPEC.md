Now let me fetch the full API documentation to get details on search filters, collections, and video endpoints.I have enough information from the search results. Let me compile the specification.

# Slates Specification for Pexels

## Overview

Pexels is a free stock photo and video platform that provides a library of high-quality, royalty-free visual content contributed by photographers and videographers worldwide. Its API enables programmatic access to search, browse, and retrieve photos and videos from the Pexels library. The content is free for commercial use.

## Authentication

Authorization is required for the Pexels API. Anyone with a Pexels account can request an API key, which you will receive instantly. All requests to the API must include this key.

**Method:** API Key

- Create an account on Pexels, then request your API key — you'll receive it immediately.
- Each user account is assigned one API key only.
- The key is provided by adding an `Authorization` header to every request, e.g.:
  ```
  Authorization: YOUR_API_KEY
  ```
- Base URL for photos: `https://api.pexels.com/v1/`
- Base URL for videos: `https://api.pexels.com/videos/`

No OAuth flow or scopes are involved. Authentication is solely through the API key in the header.

## Features

### Photo Search

Search the Pexels library for photos matching a keyword query. Supports orientation, size, and color filters. The library is searchable in 28 languages.

- **Parameters:** Query string, orientation (landscape, portrait, square), size (small, medium, large), color, locale.
- Photos are returned with multiple pre-generated size variants (original, large, medium, small, portrait, landscape, tiny).

### Curated Photos

Browse real-time photos curated by the Pexels team. At least one new photo is added per hour, providing a changing selection of trending photos.

- Useful for displaying featured or trending content without a specific search query.

### Photo Retrieval

Retrieve a specific photo by its ID. Returns full photo details including dimensions, photographer info, average color, alt text, and URLs for multiple image sizes.

### Video Search

Search for videos by keyword query. Supports orientation and size filters.

- **Parameters:** Query string, orientation, size, locale.
- Videos are returned with multiple file variants at different resolutions and qualities.

### Popular Videos

Retrieve a selection of currently popular/trending videos on Pexels.

- **Parameters:** Minimum and maximum width/height and duration for filtering results.

### Video Retrieval

Fetch a specific video by its ID. Returns full video details including duration, dimensions, videographer info, video files at various qualities, and preview pictures.

### Collections

Browse featured collections curated by Pexels. Retrieve all media (photos and videos) within a single collection. You can filter to only receive photos or videos using the type parameter.

- List your own collections or browse Pexels-featured collections.
- Retrieve the contents of a specific collection by its ID.
- Collections can be sorted.

### Attribution Requirement

Credit to photographers is expected when possible (e.g., "Photo by John Doe on Pexels" with a link to the photo page). You may not copy or replicate core functionality of Pexels. Wallpaper apps are not supported within their eligibility requirements.

## Events

The provider does not support events. Pexels does not offer webhooks or any event subscription mechanism.
