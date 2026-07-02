Let me get the complete list of webhook topics and OAuth scopes.# Slates Specification for Intercom

## Overview

Intercom is a customer messaging platform that enables businesses to communicate with customers via live chat, email, SMS, and in-app messaging. It provides tools for customer support (conversations, tickets, help center), customer data management (contacts, companies), and AI-powered automation (Fin AI agent). The platform offers a REST API (currently v2.15) with regional endpoints for US, EU, and Australia.

## Authentication

Intercom supports two authentication methods depending on the use case:

### 1. Access Token (Private Apps)

An Access Token is for accessing data in your own Intercom workspace, i.e., building a private app. Intercom provides an Access Token as soon as you create an app on your workspace. You can find it in the Configure > Authentication section in your app within the Developer Hub.

Provide the token as an `Authorization: Bearer <access_token>` header in requests.

### 2. OAuth 2.0 (Public Apps)

If you are building a public integration that will have access to other peoples' Intercom data, you are required to set up OAuth.

**OAuth Flow:**

1. Obtain `client_id` and `client_secret` from the Basic Information page in the Developer Hub.
2. Redirect users to the authorization URL:
   ```
   https://app.intercom.com/oauth?client_id=<CLIENT_ID>&state=<RANDOM_STATE>
   ```
3. After the user approves, Intercom redirects to your callback URL with a `code` and `state` parameter.
4. Exchange the authorization code for an access token by POSTing to:
   ```
   https://api.intercom.io/auth/eagle/token
   ```
   with parameters: `code`, `client_id`, `client_secret`.
5. The response returns a Bearer token to use in the `Authorization` header.

The OAuth token does not expire and does not need to be refreshed.

**Redirect URLs** must use HTTPS. Multiple redirect URLs can be configured.

### Regional API Endpoints

Intercom workspaces can be hosted in three distinct regions — US, EU, and Australia. If you call `api.intercom.io`, Intercom will attempt to route your request to the correct region, but you can also specify region-specific endpoints:

- US: `https://api.intercom.io/`
- EU: `https://api.eu.intercom.io/`
- Australia: `https://api.au.intercom.io/`

### Permissions / Scopes

Scopes are configured per app and control what data the token can access. Key scope categories include:

**People & conversation data:** Read/write users and companies, read/write conversations, read/write tags, read/write events, read/write tickets, read/write custom object instances, export content data.

**Workspace data:** Read/update admins, read admin activity logs, read/write articles, read/write news items and newsfeeds, read/write AI content, create phone call redirects.

## Features

### Contact Management

Create, update, search, archive, merge, and delete contacts (users and leads). Contacts can have custom attributes and can be organized by tags and segments. Supports attaching contacts to companies.

### Company Management

Create, update, and delete companies. Companies can be associated with contacts and have custom attributes. Supports listing and searching companies.

### Conversations

Manage customer conversations including creating new conversations, replying (as admin or on behalf of contacts), assigning to teammates or teams, snoozing, closing, and adding notes. Supports conversation search, tagging, and priority management. Conversation ratings can be retrieved.

### Tickets

Create and manage support tickets with configurable ticket types and states. Tickets support custom attributes, assignment to admins or teams, and state transitions. Ticket types and their attributes can be configured via the API.

### Help Center / Articles

Create, update, and manage help center articles and collections. Articles support multilingual content. Useful for powering self-service knowledge bases and providing content for the Fin AI agent.

### Messaging

Send outbound messages (in-app, email) to contacts. Supports initiating new conversations from admins to users.

### Tags

Create, update, and delete tags. Tags can be applied to contacts, companies, and conversations for organization and filtering.

### Data Events

Submit and retrieve custom events associated with contacts. Events track user activity and can be used for segmentation and triggering automations.

### Data Attributes

Create and manage custom data attributes for contacts, companies, and conversations beyond the default fields.

### Custom Objects

Create, read, update, and delete custom object instances to model domain-specific data within Intercom.

### Admins / Teammates

List and retrieve admin (teammate) details. Update admin away status. Access admin activity logs for audit purposes.

### AI Content

Manage external pages and content import sources for the Fin AI Content Library. Useful for ingesting non-public pages that Fin should be able to reference.

### Fin AI Agent

The Fin Agent API is currently under managed availability and requires contacting the accounts team for access. Allows starting and managing AI-powered conversations through dedicated endpoints.

### Calls

Retrieve call data including transcriptions and recordings for phone-based support interactions.

### News

Create and manage news items and newsfeeds to communicate updates to customers through the Intercom Messenger.

### Segments

List and retrieve contact segments. Segments are defined in the Intercom UI and are read-only via the API.

### Data Export

Export workspace data in bulk. Also supports reporting dataset exports to replicate Intercom report metrics in external BI tools.

### Subscription Types

Manage email subscription types that contacts can opt in or out of.

## Events

Webhooks are a way to access real-time notifications about events that happen in your Intercom workspace. You can create a webhook subscription within your Intercom app by choosing the topics you want to be notified about and providing an endpoint URL where you want the notifications to be sent.

Webhook notifications are signed via an `X-Hub-Signature` header using HMAC SHA-1 with your app's `client_secret` for verification.

### Admin Events

Notifications for admin (teammate) activity: added to or removed from workspace, away mode updates, login/logout, and activity log creation.

### Call Events

Notifications when calls start, end, and when transcriptions or recordings become available.

### Company Events

Notifications for company creation, update, deletion, and when companies are attached to or detached from contacts.

### Contact Events

Notifications for contact lifecycle events: creation (user or lead), updates, deletion, archiving/unarchiving, merging, email changes, lead-to-user conversion, tagging/untagging, and email subscription/unsubscription changes.

### Conversation Events

Notifications for conversation activity: creation (by admin or user), replies (by admin, user, or bot), assignment, opening, closing, snoozing/unsnoozing, deletion, rating added, priority updates, contact/company association changes, conversation part redaction, and conversation part tagging.

### Content Stat Events

Notifications for engagement metrics across all outbound content types: banners, carousels, chat messages, checklists, custom bots, emails, news items, posts, push messages, series campaigns, SMS, surveys, tooltips, and product tours. Each content type fires events for delivery, engagement (clicks, opens, replies), goal completion, and type-specific actions (e.g., email bounces, survey answers).

### Ticket Events

Notifications for ticket lifecycle: creation, state updates (including resolution), note creation, admin/team assignment, contact attachment/detachment, attribute updates, admin/contact replies, closure, and ratings.

### Data Event Events

Notification when a custom data event is created.

### Subscription Events

Notifications when contacts subscribe to or unsubscribe from specific message subscription types.

### Visitor Events

Notification when a visitor converts to a user (signs up).

### API Activity Events

Notification when a v3 API request completes successfully.

### Job Events

Notification when an API-enqueued job completes.

### Data Connector Events

Notification when a Data Connector action execution completes, including success/failure status and error categorization.
