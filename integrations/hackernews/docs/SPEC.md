Let me fetch the Algolia HN Search API page for additional details on the search feature.# Slates Specification for Hacker News

## Overview

Hacker News is a social news website run by Y Combinator, focused on computer science and entrepreneurship. The Hacker News API provides developers with access to the site's content, including stories, comments, polls, and users. The API provides read-only access to Hacker News data in near real-time.

## Authentication

The Hacker News API doesn't require any authentication or API key. You can access all public endpoints with just a GET request. There's no need to register, you can dive straight into your project.

The API is hosted on Firebase at `https://hacker-news.firebaseio.com/v0/` and is accessible as a standard REST API. No OAuth, API keys, tokens, or any other credentials are needed.

An additional search API is available via Algolia at `https://hn.algolia.com/api/v1/`, which also requires no authentication.

**Note:** The API is currently read-only. There is no public API for write operations such as submitting stories, posting comments, or voting.

## Features

### Item Retrieval

Retrieve any individual piece of content by its unique integer ID. All link posts, comments, jobs, Ask HN posts, and polls are categorized as "items". Each item contains core information, including the title, text, author, comment count, and child comment IDs.

- Item types include: story, comment, job, poll, and pollopt.
- Comments reference their parent item and contain child comment IDs, forming a tree structure.
- Only users that have public activity (comments or story submissions) on the site are available through the API.

### Story Listings

Access curated lists of story IDs by category.

- Up to 500 top and new stories are available via top stories and new stories listings.
- Best stories are also available.
- Up to 200 of the latest Ask HN, Show HN, and Job stories are available.
- Stories are returned as arrays of item IDs, which must then be individually fetched.

### User Profiles

Retrieve data on a specific user, including their karma, submission history, and bio.

- Users are looked up by their case-sensitive username.
- Profile data includes creation date, karma score, self-description, and list of submitted item IDs.

### Changed Items and Profiles

Item and profile changes are available via the updates endpoint. This returns lists of recently changed item IDs and user profiles, useful for keeping data synchronized.

### Full-Text Search (via Algolia)

The site's search and discovery experience is powered by Algolia, exposed as a public API.

- Search by relevance, sorted by relevance, then points, and then the number of comments.
- Search by date, with results sorted by date, more recent first.
- Filter by content type using tags (e.g., story, ask_hn, show_hn, job).
- Advanced filtering by author, points thresholds, or date ranges using numeric filters.
- Retrieve full comment trees for a story in a single request, unlike the official Firebase API which requires recursive fetching.

### Max Item ID

The current largest item ID is available. You can walk backward from it to discover all items. This is useful for data collection or iterating over the entire dataset.

## Events

The Hacker News API does not support webhooks or event subscription mechanisms directly.

However, the Firebase backend supports change notifications. You can subscribe to individual items and profiles, as well as observe front page ranking, new items, and new profiles. This is achieved through Firebase's real-time database listeners (using Firebase client libraries), which push updates when data changes at a subscribed path.

### Firebase Real-Time Listeners

- **Item changes:** Subscribe to any item path (e.g., `/v0/item/{id}`) to receive updates when that item's data changes (e.g., score updates, new child comments).
- **Story list changes:** Subscribe to story listing paths (e.g., `/v0/topstories`, `/v0/newstories`) to be notified when rankings change or new stories appear.
- **Updates feed:** Subscribe to `/v0/updates` to receive notifications about recently changed items and profiles.

These are Firebase-native real-time subscriptions, not traditional webhooks. They require use of a Firebase client library or the Firebase REST streaming API (Server-Sent Events).
