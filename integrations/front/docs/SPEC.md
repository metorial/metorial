Now let me get the specific OAuth scopes and webhook event types from Front's documentation.Now let me get the full list of event types:The events page didn't render the table with event types. Let me search for the specific event types.Now I have comprehensive information to write the specification. Let me compile it.

# Slates Specification for Front

## Overview

Front is a customer operations platform that provides shared inboxes for team-based email, SMS, chat, and social media communication management. It offers a Core API for programmatic access to conversations, contacts, messages, tags, and other entities, a Channel API for connecting external messaging platforms, and a Plugin SDK for embedding custom UI in Front's sidebar.

## Authentication

Front supports two authentication methods: **API Tokens** and **OAuth 2.0**.

### API Tokens

API tokens allow you to test the Front Core API or implement integrations that make programmatic updates via the API. Once you have an API token, you can use it to authenticate Core API requests. API tokens apply at a company level rather than being tied to a specific user.

The Core API uses Bearer tokens to authenticate its user. You MUST send the token for each request in the Authorization header. The token MUST be preceded by `Bearer`.

API tokens are created in **Settings > Developers > API Tokens** within Front.

### OAuth 2.0

For partners looking to launch a public integration to all Front customers, if your integration can support OAuth you'll want to check out the OAuth guide. Front requires that public integrations use OAuth unless there is a reason they cannot.

Front's OAuth implementation uses the **authorization code grant type**:

1. **Authorization Request**: Redirect the user to `https://app.frontapp.com/oauth/authorize?response_type=code&client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>`. An optional `state` parameter is supported for CSRF protection.
2. **Authorization Code**: After approval, the user is redirected to your `redirect_uri` with a `code` query parameter.
3. **Token Exchange**: POST to `https://app.frontapp.com/oauth/token` with the `code`, `redirect_uri`, and `grant_type=authorization_code`. Your request MUST be authenticated with Basic authentication using your OAuth application Client ID and Client Secret base64 encoded.
4. **Refresh Tokens**: To obtain a new access_token, send a POST request to `https://app.frontapp.com/oauth/token` with the refresh_token and grant_type set to `refresh_token`. Refresh tokens are valid for 6 months. Access tokens expire after 60 minutes. During the six months of validity, the API will return the same refresh token. In the last 24 hours of validity, the API will return a new refresh token, which will then start a new six month period of validity.

### Token Scopes

Scopes are configured when creating API tokens or setting up OAuth and cover three dimensions:

**Features:**

- **Access resources** — manage Core API resources (conversations, contacts, inboxes, etc.)
- **Auto-provisioning** — manage provisioning resources via SCIM (not generally available)
- **Application triggers** — process events from external services (not available for OAuth tokens)

**Namespaces:**

- **Global resources** — company-level resources (company rules, teams, accounts)
- **Shared resources** — workspace-scoped resources (shared inboxes, workspace tags); can be set to all shared workspaces or specific ones
- **Private resources** — individual teammate resources (personal inboxes, signatures); requires the teammate to enable API access

**Permissions** (per namespace):

- **Read** — retrieve resource information
- **Write** — create and update resources
- **Delete** — remove resources
- **Send** — create and send messages (distinct from importing historical messages, which only requires Write)

## Features

### Conversation Management

The Core API allows developers to access and update almost all elements in Front, including messages, contacts, channels, inboxes, teammates, analytics and more. You can list, search, create, update, and delete conversations. Conversations can be assigned/unassigned to teammates, moved between inboxes, archived, reopened, trashed, or restored. You can also manage conversation followers, tags, links, and reminders.

### Messaging

Create new messages to start conversations, reply to existing conversations, or create drafts for review before sending. The Send permission is required for creating and sending messages, which is different from endpoints that import historical messages, which only require the Write permission. Messages can also be imported for historical data migration.

### Contact and Account Management

Create, update, delete, and search contacts. Contacts support custom fields, handles (email, phone, etc.), notes, and profile images. Contacts can be organized into groups and contact lists. Accounts represent companies or organizations and can have contacts associated with them.

### Inbox and Channel Management

List and manage inboxes (shared and private), including controlling teammate access to inboxes. Channels represent communication streams (email, SMS, social, etc.) connected to Front. With the Channels API, you can connect any messaging platform to Front. Users will then be able to leverage Front's powerful collaboration and automation features to view, triage, and respond to those messages.

### Tagging and Organization

Create, update, and delete tags at the company, team, or teammate level. Tags support hierarchical structures (parent/child). Tags can be applied to or removed from conversations for classification and routing.

### Commenting and Collaboration

Add comments to conversations for internal team communication. Comments support mentions of teammates and can have replies (threaded comments).

### Analytics

Create and fetch analytics exports and reports for measuring team performance, response times, and conversation metrics. Front allows exporting analytics data to be used in a third-party BI tool or data warehouse.

### Knowledge Base Management

Create and manage knowledge bases, categories, and articles. Supports multiple locales for internationalized content. Articles can be created, updated, and organized within categories.

### Rules

List and view rules at company, team, or teammate levels. Rules are the automation engine in Front, allowing automatic actions based on triggers and conditions.

### Teammates and Teams

List and update teammates, manage team membership, and control teammate availability. Teams (workspaces) organize inboxes and resources. Teammate groups allow grouping teammates for access control.

### Links

Links connect Front conversations to items in external systems (e.g., feature requests, orders, shipments). You can create, list, update links and manage their associations with conversations.

### Message Templates

Create and manage reusable message templates at the company, team, or teammate level. Templates can be organized in folders and support hierarchical folder structures.

### Shifts and Signatures

Manage teammate shifts for scheduling availability and coverage. Create and manage email signatures at the team or teammate level.

### Connectors

Connectors provide a no-code means of making API calls to external systems and can also transform URLs or strings found in comments or messages into structured Orders, Shipments, Itineraries, Tasks, etc. that are easy to access right from a conversation in Front. With Connectors, you can build rules, macros, and chatbots that retrieve or update information in external systems.

### Application Triggers

Application triggers let your app listen for events that occur outside of Front. Those events can be used to initiate workflows in Front. The data from the triggering event can be utilized in your workflows to enable more powerful functionality.

## Events

Front supports webhooks for real-time event notifications. Front offers two methods for configuring webhooks: by adding a webhook feature to an app (application webhooks) or by setting up a webhook through rules (rule webhooks).

- **Application webhooks** are configured as features on apps, do not require end-user setup, and have access to shared inbox events. They send the full event payload and require OAuth for published apps.
- **Rule webhooks** are configured via Front's rules engine and can access both private and shared inbox events depending on where the rule is created. They can send either a full event payload or an event preview.

Both webhook types support signature verification for security. Webhooks exclude "mass action" events (e.g., bulk inbox moves, mass status updates, historical message imports).

### Event Categories

The following event types are available through webhooks:

- **Conversation assignment**: Events when a conversation is assigned (`assign`) or unassigned (`unassign`) from a teammate.
- **Inbound messages**: Events when a new inbound message is received (`inbound`), including new conversations and replies.
- **Outbound messages**: Events when an outbound message is sent (`outbound`) or an outbound reply is sent (`out_reply`).
- **Conversation lifecycle**: Events when a conversation is archived (`archive`), reopened (`reopen`), trashed (`trash`), or restored (`restore`).
- **Tagging**: Events when a tag is added (`tag`) or removed (`untag`) from a conversation.
- **Comments and mentions**: Events when a comment is added (`comment`) to a conversation or a teammate is mentioned (`mention`).
- **Conversation movement**: Events when a conversation is moved between inboxes (`move`).
- **Drafts**: Events related to draft creation and updates.
- **Ticketing**: Events when a ticket status changes (`ticket_status_update`).
- **AI topics**: Events when a new topic is identified by Front AI (`topic_identified`).
- **Macros**: Events when a teammate runs a macro (`macro_triggered`).

Webhook subscriptions can be filtered to specific event types. Application webhooks include an `authorization` object in the payload identifying the customer instance.
