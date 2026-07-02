Now let me get the full API docs from the Postman documentation to see all endpoints:Now I have a comprehensive view of the RiteKit API. Let me compile the specification.

# Slates Specification for Ritekit

## Overview

RiteKit is a social media optimization platform providing APIs for hashtag analytics, company/person insights, image generation, emoji suggestions, and link shortening. It is primarily used by developers building social media tools and CRM/enrichment applications that need programmatic access to hashtag data, company logos, brand colors, and content enhancement features.

## Authentication

RiteKit primarily uses API key (Client ID) authentication. OAuth has been phased out and is no longer supported.

**API Key (Client ID):**

1. Sign up for a RiteKit account, go to the API Console at `https://ritekit.com/developer/dashboard/`, and click "Create a token" to get your Client ID.
2. Pass your Client ID as a GET query parameter `client_id` in all API calls.

Example:

```
GET https://api.ritekit.com/v1/stats/multiple-hashtags?tags=php&client_id=YOUR_CLIENT_ID
```

This method should only be used when the Client ID is not exposed publicly (i.e., server-side calls). The token should be in the query string, not the header.

The base URL for all API calls is `https://api.ritekit.com`.

## Features

### Hashtag Analytics & Suggestions

Provides tools for discovering, analyzing, and automatically adding hashtags to social media content.

- **Auto-Hashtag:** Returns text of a post with up to two relevant hashtags added, taking into account real-time hashtag popularity. Configurable options include max number of hashtags and position (end of text or inline).
- **Hashtag Suggestions:** Returns hashtag suggestions for a single-word topic or shorter text up to 1,000 characters, considering both semantic relevancy and real-time popularity.
- **Hashtag Suggestions for Image:** Generates hashtag suggestions based on image content.
- **Hashtags for URL:** Suggests hashtags based on the content of a given URL.
- **Hashtag Stats:** Returns real-time stats for up to 100 hashtags (updated hourly). Stats include color-grading (green for trending, red for overused), exposure, and engagement metrics. Can filter to only green (trending) or Latin-character hashtags.
- **Trending Hashtags:** Returns currently trending hashtags.
- **Banned Instagram Hashtags:** Detects whether given hashtags are currently banned on Instagram.

### Person Insights

Tools for enriching and validating email-based user data.

- **Freemail Detection:** Identifies whether an email address belongs to a free email provider (e.g., Gmail, Yahoo).
- **Disposable Email Detection:** Detects disposable/throwaway email addresses from thousands of known disposable email services.
- **Email Typo Detection:** Identifies common typos in email addresses and suggests corrections.
- **Name from Email:** Extracts a person's name from their email address.
- **Full Email Insights:** Combines multiple person insight checks into a single call.

### Company Insights

Tools for retrieving company information based on domain or company name.

- **Company Name to Domain:** Resolves a company name to its website domain.
- **Company Logo:** Returns a company logo based on a website domain. If the logo is not in the database, it is extracted from the site on the fly. Logos are available in square and original aspect ratio, with options for resizing, transparent/solid backgrounds, and fallback logos generated from brand colors. Initial extraction may take 30–60 seconds for new domains.
- **Company Brand Colors:** Returns the brand colors used on a company's website.

### Emoji Tools

- **Emoji Suggestions:** Suggests relevant emojis for given text.
- **Auto-Emojify:** Automatically inserts relevant emojis into text.

### Image & Video Generation

Tools for creating and manipulating images and videos for social media.

- **Text to Image:** Generates a styled quote image from text, with configurable fonts, colors, backgrounds (solid, gradient), brand logo overlay, and animation effects.
- **Animate Image:** Converts a static image into an animated GIF with effects (e.g., glint).
- **Extract Top Image from URL:** Extracts the main/featured image from a given web page URL.
- **Permanent Image URL:** Provides a persistent, hosted URL for images (each view costs 1 API credit).
- **Convert Video for Instagram:** Converts video files to Instagram-compatible format.

### Text Extraction

- **Extract Article from URL:** Extracts the main article content from a web page.
- **Link Preview:** Returns preview metadata (title, description, image) for a given URL.

### Link Shortening

- **Shorten Link:** Creates shortened URLs with an optional call-to-action (CTA) ad overlay. Users can list available CTAs. Requires each user to authenticate with RiteKit.
- **List of Link Ads:** Returns the list of available CTA options for the authenticated user.

## Events

The provider does not support events. RiteKit's API is purely request-response based and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
