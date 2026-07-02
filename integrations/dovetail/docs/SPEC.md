Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Dovetail

## Overview

Dovetail is a customer insights and research platform that helps teams collect, organize, and analyze qualitative and quantitative user research data. It centralizes research artifacts like interview transcripts, notes, video/audio recordings, survey data, and feedback, and provides tools for tagging, analysis, and sharing insights across teams.

## Authentication

### Personal API Tokens

Dovetail uses personal API tokens for authentication. Tokens are generated from Settings → Account under "Personal API keys."

**How to obtain a token:**

1. Navigate to your Dovetail account settings at `https://dovetail.com/settings/user/account`.
2. Enter a label for the key and create it.
3. Copy the token immediately — it is only displayed once.

**Token format:** The token is an opaque string prefixed with `api.`, e.g., `api.wcFxxx...`.

**Token expiry:** The token is valid for 30 days; a new token must be generated after expiry. Tokens can also be manually revoked.

**Usage:** Include the token as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <DOVETAIL_API_TOKEN>
```

**Base URL:** `https://dovetail.com/api/v1/`

### OAuth 2.0

OAuth 2.0 authentication for third-party applications is listed in the documentation but is marked as "Coming Soon" and is not yet available.

## Features

### Project Management

Create, list, and retrieve research projects. Projects serve as the primary organizational unit for grouping related research data, notes, and insights.

### Notes

Create, read, update, and delete notes within projects. Notes capture research observations, interview summaries, and other qualitative data. Supports importing files into notes and exporting notes.

### Data Management

Create, list, read, update, and delete data entries. Data can be imported from files and exported in various formats. This is used for storing structured research data like survey responses or feedback entries.

### Insights

Create, manage, and share insights derived from research. Insights can be listed globally or filtered by user. Supports file import and export. Insights represent the key findings and conclusions from research activities.

### Highlights

List and retrieve highlights — annotated excerpts from research data that represent noteworthy findings tied to specific tags or themes.

### Tags

List and retrieve tags used for qualitative coding and thematic analysis of research data. Tags represent themes, pain points, feature requests, or other categories applied to highlights.

### Contacts

Create, list, read, and update contacts (research participants/customers). Contacts represent the people involved in research activities.

### Docs

Create, list, read, update, and delete documents. Docs support file import and export, and can be listed per user. Useful for storing research reports or standalone documentation.

### Channels and Topics

Create, update, and delete channels for organizing feedback streams. Within channels, you can create and manage topics and add data points. Channels are used to aggregate feedback from different sources (e.g., support tickets, app reviews).

### Folders

List folders and retrieve folder contents to navigate the organizational hierarchy of a workspace.

### Files

Retrieve files by ID that are attached to various entities within Dovetail.

### AI-Powered Search and Summarization

- **Magic Search / Search V2:** Perform semantic searches across the workspace to find relevant research data and insights using natural language queries.
- **Magic Summarize:** Generate AI-powered summaries of research data to quickly extract key themes and findings.

## Events

The provider does not support events. Dovetail's API does not currently offer webhooks or a purpose-built event subscription mechanism. OAuth 2.0, which could potentially enable event flows, is marked as coming soon but is not yet available.
