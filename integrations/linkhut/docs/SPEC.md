# Slates Specification for Linkhut

## Overview

Linkhut is an open-source social bookmarking service that allows users to save, tag, manage, and share web bookmarks. It is API-compatible with Pinboard and can be self-hosted. The flagship instance is hosted at ln.ht.

## Authentication

Linkhut supports two authentication methods:

### Personal Access Tokens

Users can create a personal access token at `https://ln.ht/_/oauth/personal-token`. This token has unrestricted access to all API methods and is used as a Bearer token (see below). Suitable for personal use only — should not be shared with third parties.

### OAuth 2.0 (Authorization Code Flow)

For third-party applications, Linkhut supports the standard OAuth 2.0 authorization code flow.

**Registration:** Register an OAuth application at `https://ln.ht/_/oauth/register` to obtain a **client ID** and **client secret**.

**Authorization URL:**

```
https://ln.ht/_/oauth/authorize?response_type=code&client_id=<CLIENT_ID>&scope=<SCOPES>&redirect_uri=<REDIRECT_URI>
```

**Token URL:** `https://api.ln.ht/v1/oauth/token`

**Token Refresh:** Supported via the same token endpoint using `grant_type=refresh_token`. Requesting a new access token automatically revokes the previous one. Access tokens expire after one year (31,536,000 seconds).

**Scopes:** Scopes follow the format `context:access`, where `context` is the API resource (e.g., `posts`, `tags`) and `access` is either `read` or `write`. Multiple scopes are space-separated. Note: users can edit requested scopes before consenting, so applications must handle scope mismatches.

**Using tokens:** Set the `Authorization` header to `Bearer <access-token>`, or pass as the `auth_token` query parameter.

## Features

### Bookmark Management

Create, retrieve, update, and delete bookmarks (referred to as "posts" in the API). Each bookmark has a URL, title (description), optional notes (extended), tags (comma-delimited), a timestamp, and visibility settings. Bookmarks can be marked as private (`shared=no`) or as unread (`toread=yes`). When adding a bookmark, replacement of an existing bookmark at the same URL can be disabled.

### Bookmark Retrieval and Filtering

Retrieve bookmarks filtered by tag, date, URL, or URL hash (MD5). Supports fetching recent bookmarks (up to 100), bookmarks for a specific day, or all bookmarks with date range filters. A change detection endpoint returns MD5 hashes and meta signatures for all bookmarks, enabling efficient sync without downloading full data.

### Tag Management

List all tags with usage counts, delete a tag from all bookmarks, or rename a tag across all bookmarks.

### Tag Suggestions

Get popular (site-wide) and recommended (user-specific) tag suggestions for any given URL, useful for consistent tagging.

### Change Detection

Check the timestamp of the most recent bookmark modification to determine if a full data sync is needed, avoiding unnecessary API calls.

### Data Export

Bookmarks can be exported for portability. The platform supports the Netscape bookmark format for import/export.

## Events

The provider does not support events. Linkhut does not offer webhooks or built-in event subscription mechanisms. It provides a change detection endpoint (`/v1/posts/update`) that returns the timestamp of the last modification, but this is a standard API call rather than a purpose-built polling mechanism.
