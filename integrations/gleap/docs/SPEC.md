# Slates Specification for Gleap

## Overview

Gleap is a customer feedback and support platform for websites and mobile apps. It provides bug reporting, live chat, help centers, surveys, product tours, and AI-powered customer support through embeddable widgets. The platform also offers a REST API for programmatic access to tickets, sessions, messages, help center content, engagements, and project management.

## Authentication

Gleap uses Bearer token authentication along with a project identifier header. Every API request requires two headers: an `Authorization` header with a Bearer token and a `Project` header with your project ID.

**Getting Credentials:**

Obtain an API key by signing up at app.gleap.io. Once registered, navigate to **Project > Settings > Security** in the Gleap dashboard. Copy the API key from this page. The Project ID is also displayed on the same page.

**Required Headers:**

Every request must include:

```
Authorization: Bearer YOUR_API_KEY
Project: YOUR_PROJECT_ID
Content-Type: application/json
```

**Base URL:** `https://api.gleap.io/v3`

There is no OAuth2 flow; authentication is solely API key-based. The API key should be kept secure and never exposed in client-side code.

## Features

### Ticket Management

Allows creating, retrieving, updating, and querying support tickets (bug reports, feature requests, support requests). Tickets can be queried by any property on the document, including status, priority, assigned user, and date ranges using comparison operators. Ticket types include BUG, and other feedback categories. Tickets are linked to sessions (contacts/users).

### Session (Contact) Management

Allows creating and managing user sessions that represent contacts or end-users. Sessions store user identity information (userId, email, name) along with custom data attributes. If a session with the same userId already exists, the existing session can be reused.

### Messaging and Comments

Allows adding messages/comments to tickets. Comments support plain text, rich formatted content (structured document format), and file attachments. Messages can be posted as agent replies, internal notes (using `isNote: true`), or customer comments (by specifying the session ID).

### Help Center Management

Provides management of help center content including collections (categories) and individual articles. Also supports configuring help center settings and redirects.

### Message Templates

Allows managing reusable message templates for consistent communication.

### Engagement Campaigns

Supports creating and managing various outbound engagement types:

- **Banners** — In-app banner messages
- **Chat Messages** — Proactive chat messages
- **Emails** — Email campaigns
- **Surveys** — In-app and outbound surveys
- **Product Tours** — Guided walkthroughs
- **Tooltips** — Contextual UI hints
- **Checklists** — Onboarding or task checklists
- **News** — In-app news/announcements
- **Modals** — Pop-up modals
- **WhatsApp Messages** — WhatsApp outbound messages
- **Cobrowse** — Co-browsing sessions
- **Push Notifications** — Push notification campaigns

### AI Content

Allows managing AI content that powers Gleap's AI assistant (Kai) for automated customer support responses.

### Team Management

Allows managing team members and their roles within a project.

### User and Invitation Management

Supports managing users and sending invitations to new team members.

### Project Configuration

Allows retrieving and updating project-level settings.

### Statistics

Provides access to project analytics and reporting data.

## Events

Gleap supports webhooks that automatically send selected feedback types to a configured endpoint, together with all the important metadata and screenshots. You can choose which feedback types trigger the webhook.

Webhooks are configured through the Gleap dashboard under the Integrations section.

### Feedback Created

Triggers when a new feedback is created. This includes bug reports, feature requests, and other ticket types submitted through the Gleap widget or API. The payload includes ticket metadata and screenshots.

### Feedback Updated

Triggers when feedback is updated. Fires when an existing ticket/feedback item is modified, such as status changes, assignment changes, or comment additions.

### Feedback Deleted

Triggers when feedback is deleted. Fires when a ticket/feedback item is removed from the project.
