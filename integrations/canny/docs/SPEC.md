# Slates Specification for Canny

## Overview

Canny is a feedback management platform that allows teams to collect, organize, and prioritize user feedback and feature requests. It provides boards for feedback collection, voting, roadmaps, changelogs, and AI-powered feedback extraction (Autopilot).

## Authentication

API requests must be authenticated by including your secret API key, which can be found in your company settings. This key should be stored securely on your server and not shared. The API key is included as a POST parameter with the key `apiKey` in each request.

There is only one authentication method:

- **API Key**: A single secret key per company account.
  - Found at: `Settings > API & Webhooks` in the Canny admin dashboard.
  - Passed as a `apiKey` field in the JSON body of every POST request to `https://canny.io/api/v1/` or `https://canny.io/api/v2/` endpoints.
  - No OAuth, no scopes, no token refresh — a single static key.

## Features

### Board Management

Retrieve and list feedback boards. Boards are the top-level containers where users post and vote on ideas for specific topics (e.g., "Feature Requests", "Bug Reports"). Boards can be public or private.

### Post Management

Create, retrieve, list, update, and delete posts (feedback items) on boards. Posts can be filtered by board, author, company, tags, status, and searched by keyword. Posts support custom fields, images, ETAs, and owner assignment. Posts can be moved between boards, merged together, and linked/unlinked to Jira issues. Post statuses (open, under review, planned, in progress, complete, closed, or custom) can be changed with optional voter notifications.

### Comment Management

Create, retrieve, list, and delete comments on posts. Comments support images, internal-only visibility, threaded replies (via parentID), and mentioning users. Comments can optionally trigger email notifications to voters.

### Vote Management

Create, retrieve, list, and delete votes on posts. Votes can be cast on behalf of users by admins and support priority levels (Nice to have, Important, Must have). Votes can be filtered by board, post, user, or company.

### User Management

Create or update users, retrieve user details (by Canny ID, application user ID, or email), list users, and delete users. Users can be associated with companies and have custom fields. Users can be removed from companies.

### Company Management

List, update, and delete companies. Companies are associated with users and can have custom fields and monthly spend (MRR) data. Company data may sync from external integrations like HubSpot or Salesforce.

### Category & Tag Management

Create, retrieve, list, and delete categories and tags on boards. Categories are board-specific and support hierarchical nesting (parent/child). Tags are also board-specific. Both can be assigned to or removed from posts.

### Ideas & Groups

List and retrieve ideas, which represent feature requests with rich filtering (by author, group, owner, status, custom fields) and sorting. Ideas support parent-child hierarchies and can be merged. Groups allow organizing ideas within a company and can be nested.

### Insights

List and retrieve insights — pieces of feedback or context associated with ideas. Insights include priority levels, source information, and associated users/companies.

### Opportunities

List opportunities synced from Salesforce or HubSpot, linked to posts. Includes opportunity value, closed/won status, and linked post/idea IDs.

### Changelog Management

Create and list changelog entries. Entries can be published immediately, scheduled for future publication, or saved as drafts. Entries support types (new, improved, fixed), labels, linked posts, and notifications to users. Translated changelog content can be requested via the `Accept-Language` header (14 languages supported).

### Status Changes

List status change history for posts, including the changer, timestamp, and associated comment. Can be filtered by board.

### Roadmaps

Roadmaps are collections of posts. Roadmap data is exposed through post-related API endpoints.

### Autopilot (AI Feedback Processing)

Enqueue text content (call transcripts, conversations) for AI-powered feature request extraction and deduplication. Supports specifying source type (e.g., Twitter, Zoom) and source URL. Each request consumes one Autopilot credit. The inbox has a 100-item limit in manual mode.

## Events

By setting up webhooks, your server will be notified of Canny events as they happen. For example, if a user creates a new post, we would send a request to your server to let you know. You can set up webhooks for your account in the API & Webhooks settings page.

Webhook requests include signature headers (`canny-timestamp`, `canny-nonce`, `canny-signature`) for verification using HMAC SHA-256 with your API key.

### Post Events

- **post.created** — A new post is created.
- **post.edited** — A post is edited.
- **post.deleted** — A post is deleted.
- **post.status_changed** — A post's status is changed.
- **post.tag_added** — A tag is added to a post.
- **post.tag_removed** — A tag is removed from a post.
- **post.jira_issue_linked** — A Jira issue is linked to a post.
- **post.jira_issue_unlinked** — A Jira issue is unlinked from a post.

### Comment Events

- **comment.created** — A new comment is created.
- **comment.edited** — A comment is edited.
- **comment.deleted** — A comment is deleted.

### Vote Events

- **vote.created** — A user votes on a post.
- **vote.deleted** — A user removes their vote from a post.
