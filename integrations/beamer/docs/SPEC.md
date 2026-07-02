Now let me fetch the API reference page to get details about the actual REST API endpoints.The API page doesn't show the actual reference - it seems to be loaded dynamically. Let me search for the actual API reference content.Now let me get the Make.com documentation which seems to have more detail about Beamer's API capabilities:Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Beamer

## Overview

Beamer is a customer communication platform for SaaS products that provides changelog/release notes, in-app notifications, NPS surveys, and user feedback collection (ideas/feature requests). It allows product and marketing teams to announce updates, collect user reactions and comments, measure customer satisfaction, and manage a public roadmap — all through embeddable widgets and a standalone feed.

## Authentication

All requests to the API must include the API key in the `Beamer-Api-Key` header, as unauthenticated requests will be rejected.

**API Key Authentication:**

- To obtain your API key, navigate to Settings, click API, and copy the API key displayed on screen.
- The API key is passed via the `Beamer-Api-Key` HTTP header on every request.
- The base API endpoint is `https://api.getbeamer.com/v0/`.
- You can create separate API keys with read-only permission for front-end use. Multiple API keys can be created with different permission levels from the Settings > API section.
- The key can be rotated on Beamer's website.

**Example request:**

```
curl --header "Content-Type: application/json" \
     --header "Beamer-Api-Key: YOUR-BEAMER-API-KEY" \
     --request GET \
     https://api.getbeamer.com/v0/posts
```

## Features

### Post Management (Changelog / Announcements)

You can make use of the `/posts` endpoint to create notifications/posts in your Beamer account. Posts are the core content unit in Beamer — used for release notes, feature announcements, bug fixes, and general announcements.

- Create, read, update, delete, and search posts.
- Posts support multi-language translations, categories (e.g., New, Improvement, Fix, or custom), and rich content including images, GIFs, and videos.
- Posts can be scheduled with a publication date and an optional expiration date, or pinned to the top of the feed.
- Options to enable/disable feedback (hidden comments), reactions (positive/neutral/negative), social media sharing, auto-open, and push notifications per post.
- Posts can be filtered to specific users using the `filterUserId` parameter to send single-user notifications.
- Posts support segment filters and segment URLs for targeting specific user groups.

### Unread Count & Feed URL

- A GET request to `/unread/count` retrieves the number of unread posts matching optional query parameters, and the response includes the URL of the user's feed for displaying via iframe or webview.
- Supports filtering by segment, date range, and user identity parameters.

### NPS (Net Promoter Score)

- The `/nps/check` endpoint allows you to check whether a specific user should be shown the NPS prompt based on the criteria set in your NPS settings, and if the user qualifies, the API returns a URL to display the NPS prompt.
- Useful for integrating NPS surveys into native mobile apps or custom implementations where the embed widget cannot be used.

### Feature Requests / Ideas

- Create new feature requests, allowing users to submit ideas or suggestions for your product.
- Add comments to existing posts or feature requests, fostering dialogue and engagement within the user community.

### User Segmentation

- Beamer allows you to segment updates by demographics, location, language, URL, and past behaviour on your site.
- Segment filters can be passed when creating posts and when configuring the embed widget to control which posts are visible to which user groups.
- Advanced segmentation (Enterprise plan) allows creating segments directly in the Beamer dashboard using AND/OR logic on user attributes.

## Events

Webhooks allow you to create custom integrations between Beamer and your own app or service. When setting up a new webhook, you select the type of event to receive and set the endpoint where you want to receive them. Once saved, Beamer will start sending new events of that type to the specified endpoint.

All webhooks contain an automatically generated secret. Every POST request sent to your endpoint will contain this secret within the `Beamer-Webhook-Secret` header for authenticity validation.

Webhook payloads are JSON arrays that may contain multiple events per request.

### New Post

Triggered when a new post is published. Includes post details such as ID, title, content (HTML and plain text), category, publication date, link, and visibility settings.

### New Comment

Triggered when a user submits a new comment on a post. Includes the comment text, post title, date, and user information (ID, name, email, custom attributes).

### New Reaction

Triggered when a user sends a reaction to a post. Includes the reaction type (positive, neutral, or negative), post title, date, and user information.

### New NPS Score

Triggered when a user submits an NPS score. Includes the score (numeric), optional feedback text, date, the referring URL, and user information.
