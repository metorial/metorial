Now let me get the webhook events list to complete the events section:Now I have enough information. Let me compile the specification.

# Slates Specification for Kommo

## Overview

Kommo (formerly amoCRM) is a cloud-based CRM platform focused on messenger-based sales and customer communication. It provides tools for managing leads, contacts, companies, sales pipelines, tasks, and multi-channel conversations. The platform offers a REST API (v4) along with specialized APIs for chat integrations, file management, VoIP, and AI features.

## Authentication

Kommo supports two primary authentication methods. All API requests must be made to the account-specific subdomain: `https://{subdomain}.kommo.com`.

### OAuth 2.0 (Authorization Code Flow)

OAuth 2.0 is the recommended authorization framework, based on the standard protocol. To set up:

1. **Register an integration** in a Kommo account under Settings → Integrations → Create Integration. Administrator rights are required to create an integration.
2. Upon creation, you receive an **Integration ID** (client_id) and a **Secret key** (client_secret).
3. **Authorization URL:** Direct users to `https://www.kommo.com/oauth?client_id={Integration_ID}&state={state}&mode={popup|post_message}` to grant access.
4. After the user approves, they are redirected to your **Redirect URI** with an authorization `code` and the `referer` (account subdomain).
5. **Token exchange endpoint:** `POST https://{subdomain}.kommo.com/oauth2/access_token` with `client_id`, `client_secret`, `grant_type` (`authorization_code` or `refresh_token`), `code` or `refresh_token`, and `redirect_uri`.
6. To initially obtain a pair of access and refresh tokens, you need an authorization code, which can be found in the interface or through a Redirect URI. The code expires after 20 minutes.
7. The **access token** is a JWT valid for **24 hours**. The **refresh token** is valid for **3 months** and is rotated on each use.

Tokens are passed as a Bearer token in the `Authorization` header: `Authorization: Bearer {token}`.

### Long-lived Token

When developing an integration for use only within your own account, there's no need for the full OAuth redirect flow. Long-lived tokens do not have a refresh_token and don't require exchange logic.

- To create a long-lived token, open the Keys and scopes tab, click the Generate long-lived token button, select the expiration date of the token, and copy the token.
- The token is valid from 1 day to 5 years, as selected by the user.
- Long-lived tokens are only available for **private integrations** (single-account use).
- Used the same way as OAuth access tokens: `Authorization: Bearer {token}`.

### Important Notes

- All requests must be made to the exact address of your account, e.g., `https://subdomain.kommo.com`, not the common domain.
- The **subdomain** is a required input for all API interactions; it identifies the specific Kommo account.

## Features

### Lead Management

Create, read, update, and manage sales leads. Leads can be assigned to pipelines and stages, linked to contacts and companies, tagged, and assigned to responsible users. Supports complex lead creation that simultaneously creates associated contacts and companies. Includes duplicate control to check whether entities being added already exist in the account. Loss reasons can be tracked for closed leads.

### Pipeline and Stage Management

Create, edit, and delete sales pipelines and their stages. Each pipeline contains ordered stages that represent the steps in a sales process. Stages can be customized with colors and descriptions.

### Contact and Company Management

Create, read, and update contacts and companies. Contacts and companies can be linked to leads and to each other. Custom fields can be used to store additional data. Tags can be applied for categorization.

### Task Management

Create, read, update, and delete tasks. Tasks can be linked to leads, contacts, or companies and assigned to responsible users with deadlines.

### Custom Fields and Field Groups

Define and manage custom fields for leads, contacts, companies, and catalogs (lists). Fields can be organized into groups. Various field types are supported.

### Lists (Catalogs)

Create and manage custom catalogs (lists) with elements. Useful for tracking products, services, or other structured data outside of standard CRM entities.

### Notes and Events

Add notes (including text, media files, and call records) to leads, contacts, and companies. Notes can be pinned. An event log tracks all changes across entities with detailed audit history.

### Conversations and Chat (Chats API)

Connect custom messaging sources (e.g., WhatsApp, Telegram) via the Chats API. You can develop your own integration with messaging platforms and distribute it on your own terms. Features include sending/importing messages, managing chat history, linking chats to contacts, tracking message delivery status, and handling reactions. Requires separate channel registration and its own authorization mechanism.

### Incoming Leads

Handle unsorted/incoming leads from various sources such as web forms and SIP calls. Incoming leads can be reviewed, accepted (converted to leads), declined, or linked to existing entities.

### Users and Roles

Manage account users and their roles. Roles define permission sets that control access to various CRM features and data.

### Tags

Create and manage tags for leads, contacts, and companies. Tags support custom colors for leads.

### Entity Linking

Link entities to each other (e.g., leads to contacts, contacts to companies, leads to catalog items). Supports creating and removing links between various entity types.

### Sources

Manage lead capture sources such as web forms and website chat buttons. Sources track where incoming leads originate from.

### Templates

Create and manage message templates, including WhatsApp templates that can be submitted for moderation.

### Salesbot

Salesbot is a tool for creating custom scenarios for automated operations with users via messengers. You can program Salesbot to execute various actions with leads and contacts, answer in chats automatically, and use NLP to determine user intent. Salesbots can be launched, stopped, and triggered via API.

### Files

Upload, manage, and attach files to CRM entities. Supports versioning, file restoration, and attaching/detaching files from leads, contacts, and companies.

### Kommo AI

Add knowledge sources (URLs, files, text) to power AI features. Supports importing products from CRM into the AI system.

### Calls

Log call notes and send call notifications for VoIP integrations.

## Events

Kommo supports webhooks — notifications to third-party applications about events that have occurred. Webhooks can be configured via account settings or via the API, and require an Advanced or Enterprise plan for API-based management.

Webhooks allow users to subscribe to certain events (such as a contact change or a new task), either manually or via API. When such an event occurs, the user receives the event context.

Webhooks can be registered both through the UI (Settings → Integrations → Webhooks) and programmatically via the API. Each webhook subscription specifies a destination URL and one or more event types.

### Lead Events

Lead added, edited, deleted, restored, responsible user changed, status changed, and note added — each as a separate subscribable event.

### Contact Events

Contact added, edited, deleted, restored, responsible user changed, and note added — each as a separate subscribable event.

### Company Events

Company added, edited, deleted, restored, responsible user changed, and note added — each as a separate subscribable event.

### Task Events

Task added, edited, deleted, and responsible user changed — each as a separate subscribable event.

### Customer Events

Customer added, edited, deleted, responsible user changed, and note added — each as a separate subscribable event.

### Incoming Lead Events

Incoming lead added, edited, and deleted — each as a separate subscribable event. Incoming lead deletion is also triggered when an incoming lead is accepted or declined, distinguishable by the action parameter.

### Talk (Conversation) Events

Triggered when conversations are updated, such as marking as answered or closing a talk session.

### Chat Webhooks (Chats API)

For each message sent from the Kommo interface to a chat channel, a webhook is dispatched to a specified address. Upon receiving it, the integration must process it and deliver the message to the messenger. These are specific to Chats API channel integrations and use a separate registration mechanism.

### Digital Pipeline Webhooks

Webhooks can also be configured within the digital pipeline to notify third-party applications about stage-specific events. The list of available events is more limited than account-level webhooks, and these webhooks are sent only once with no retry attempts.
