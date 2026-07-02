Let me get more details on the specific API resources.Now I have enough information to construct the specification. Let me note that webhooks are listed on their roadmap as a future feature ("Add webhooks to our API for realtime data"), so they don't currently support webhooks.

# Slates Specification for Productlane

## Overview

Productlane is a customer support tool built for modern companies. Deeply integrated with Linear, it turns customer feedback into actionable work, so nothing gets lost and every request finds its way into the roadmap. It consolidates support channels like Slack and email, integrates with Linear for prioritization, and offers features like a customer portal, public roadmap, and AI suggestions.

## Authentication

Productlane uses **API Key** authentication via Bearer token.

Obtain your API key from the API settings page in Productlane. When making requests that require authentication, set the `Authorization` header to `Bearer API_KEY`, where `API_KEY` is the key you obtained.

Example header:

```
Authorization: Bearer <API_KEY>
```

The base URL for API requests is `https://productlane.com/api/v1`.

Note that some public-facing endpoints (such as retrieving changelogs and workspaces) do not require authentication.

## Features

### Company Management

Manage companies within Productlane. The API provides a Companies resource that allows listing and managing company records associated with your workspace.

### Contact Management

Create contacts with email, name, and an array of segments. Contacts represent individual users or customers who provide feedback or interact through support channels. Contacts can be listed, created, and retrieved.

### Segment Management

Manage segments used to categorize and group contacts and companies. Segments can be synced from external sources like Intercom contacts. Segments are useful for filtering and prioritizing feedback based on customer attributes.

### Thread / Insight Management

The Threads resource supports listing, creating, retrieving, and updating insights. Insights represent feedback items or conversation threads. You can create new feedback programmatically, which is useful for ingesting feedback from external sources into Productlane.

- When creating feedback, you can associate it with a contact and relevant context.

### Portal (Public Roadmap & Voting)

Access and interact with portal-related data including projects and issues that represent your public roadmap.

- List projects, get individual projects, list issues, get individual issues, retrieve upvotes, upvote a project or issue, delete upvotes, and create feedback through the portal.
- Portal endpoints for upvoting and feedback do not require authorization and accept an email to identify the user, along with an optional project or issue ID.

### Changelog

Retrieve changelogs by listing all changelogs or getting a specific changelog by ID. Changelogs are identified by workspace ID and changelog ID. Each changelog entry includes title, date, published status, notes, and an optional image URL.

- Changelog endpoints are public and do not require authentication.

### Workspace Information

Fetch workspace details by ID, including the latest changelog entry. This is a public endpoint that does not require authentication.

## Events

Webhooks are listed on Productlane's public roadmap as a planned feature ("Add webhooks to our API for realtime data") but are not currently available.

The provider does not currently support events.
