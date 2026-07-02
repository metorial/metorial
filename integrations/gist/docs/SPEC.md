Now let me get more details on the Gist API, specifically around webhooks, OAuth, and available features.Now let me get the OAuth details.Now I have all the information needed to write the specification.

# Slates Specification for Gist

## Overview

Gist (getgist.com) is a customer messaging and marketing platform that combines live chat, email marketing, drip campaigns, knowledge base, forms, meeting scheduling, and a lightweight CRM into a single workspace. It provides a RESTful API for managing contacts, conversations, campaigns, knowledge base articles, e-commerce data, and more.

## Authentication

Gist supports two authentication methods:

### API Key (Bearer Token)

- Obtain your secret API key from **Settings > API > API Key** in the Gist dashboard.
- Include the key in the `Authorization` header of every request as a Bearer token:
  `Authorization: Bearer sk_test_BQokikJOvBiI2HlWgH4olfQ2`
- All requests must be made over HTTPS.
- Use this method when accessing your own workspace data directly.

### OAuth 2.0 (Authorization Code Flow)

Use OAuth 2.0 when building integrations that access other users' Gist workspaces.

1. **Register your application** in the [Gist Developer Portal](https://app.getgist.com/developer) to obtain a `client_id` and `client_secret`.
2. **Authorization URL:** Redirect users to:
   `https://app.getgist.com/oauth/authorize?response_type=code&client_id={CLIENT_ID}&scope={SCOPES}&redirect_uri={REDIRECT_URI}&state={STATE}`
3. **Token Exchange:** After the user authorizes, exchange the returned authorization code for an access token via a POST to:
   `https://api.getgist.com/oauth/token`
   with parameters: `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, and `code`.
4. The response returns an `access_token` to use as a Bearer token in subsequent API requests. Tokens generated via OAuth do not expire unless the app is uninstalled or deleted.

**Available OAuth Scopes:**

| Scope                 | Description                           |
| --------------------- | ------------------------------------- |
| `read_contact`        | List and view a single contact        |
| `write_contact`       | Create or update a single contact     |
| `read_bulk_contacts`  | List and view all contacts            |
| `write_bulk_contacts` | Create or update batch of contacts    |
| `read_conversations`  | List and view conversation details    |
| `write_conversations` | Create or update conversation details |
| `read_events`         | List and view events                  |
| `read_tags`           | List and view tags                    |
| `write_tags`          | Create or update tags                 |
| `read_teams`          | List and view teams                   |
| `read_teammates`      | List and view teammates               |

## Features

### Contact Management

Manage contacts (users and leads) in your Gist workspace. Create, update, retrieve, list, search, and delete contacts. Contacts support custom properties (up to 250), tags, segments, and subscription types. Contacts are de-duplicated by email address. Batch import of contacts is supported with status tracking. Contacts are classified as either "user" (has a user_id) or "lead" (email only).

### Conversations

Create, retrieve, list, search, reply to, and manage conversations across multiple channels (chat, email, Facebook, Twitter, API). Conversations can be assigned/unassigned to teammates or teams, snoozed, closed, prioritized, and tagged. Internal notes can be added. Conversation search supports filtering by assignee, team, channel, tags, and contact. Conversation counts can be retrieved globally, per team, or per teammate.

### Campaigns

Manage drip email campaigns. Retrieve and list campaigns with performance metrics (open rate, click rate, subscriber counts). Subscribe or unsubscribe contacts from campaigns, with options to set a starting email index and force-resubscribe contacts who previously unsubscribed.

### Knowledge Base (Articles & Collections)

Manage knowledge base articles and collections. Articles support multi-language translations, authoring, publishing/drafting, and search by text and locale. Collections organize articles into groups with support for nested parent/child hierarchies and multi-language translations. Knowledge base settings (domain, SEO, branding) can also be retrieved.

### Tags

Create, update, delete, and list tags. Tags can be applied to or removed from multiple contacts at once (bulk tagging). Tag names are case-insensitive and automatically de-duplicated.

### Segments

Retrieve and list dynamic contact segments defined in your workspace. Segment counts can be optionally included.

### Forms

Retrieve and list forms, view form submissions, and programmatically subscribe contacts to forms. Form submissions include field data, consent information, and page context.

### Subscription Types

Manage email subscription types. View subscription types and attach/detach contacts to control which communication categories they receive.

### Event Tracking

Track custom events associated with contacts to record product interactions (e.g., "Clicked Signup Button"). Events have a name, optional properties, and a timestamp. All workspace events can be listed.

### E-Commerce

Full e-commerce integration support including:

- **Stores:** Create and manage store connections with currency, abandoned cart interval, and auto-tagging settings.
- **Customers:** Create and manage e-commerce customers with billing/shipping addresses, linked to Gist contacts.
- **Products & Variants:** Create and manage products and product variants with categories, pricing, inventory, and SKUs.
- **Carts:** Track shopping carts with line items and checkout URLs to power abandoned cart automations.
- **Orders:** Track orders with financial status (pending, paid, refunded, cancelled, etc.), fulfillment status, tracking info, and line items. Order status changes automatically update contact lifetime value (LTV) and trigger timeline events.

### Teams & Teammates

View teams and their members. Retrieve teammate details including online/away status, team membership, and inbox seat status. These are read-only.

### Workspace Metadata

Retrieve metadata about the current workspace and token, including workspace ID, token scopes, expiration, and associated app ID.

## Events

Gist supports webhooks for real-time event notifications. Webhooks are available on Premium plans and are configured in **Settings > API > Webhooks** in the Gist dashboard. Each webhook is configured with a name, endpoint URL, topic, and optional custom request headers.

### Contact Events

- **User Created / Lead Created:** Triggered when a new user or lead is created.
- **User Deleted / Lead Deleted:** Triggered when a user or lead is deleted.
- **Contact Tagged / Contact Untagged:** Triggered when a tag is added to or removed from a contact.
- **Custom Attribute Updated:** Triggered when a contact's custom properties are updated.
- **Contact Email Updated:** Triggered when a contact's email address changes.
- **Contact Unsubscribed Emails:** Triggered when a contact unsubscribes from emails.
- **Lead Submitted Email:** Triggered when a lead submits their email address.
- **Contact Performed Event:** Triggered when a contact performs a tracked event.
- **Contact Submitted Form:** Triggered when a contact submits a form.

### Conversation Events

- **Contact Initiated Conversation:** Triggered when a contact starts a new conversation.
- **Conversation Assigned:** Triggered when a conversation is assigned to a teammate or team.
- **Conversation Opened / Conversation Closed:** Triggered when a conversation is opened or closed.
- **Conversation Rating:** Triggered when a contact rates a conversation (1–5 scale with optional remark).
- **Message From Contact:** Triggered when a contact sends a message in a conversation.
- **Teammate Replied:** Triggered when a teammate replies in a conversation.
- **Note Added:** Triggered when a teammate adds an internal note to a conversation.

### Campaign Events

- **Contact Subscribed Campaign:** Triggered when a contact is subscribed to a campaign.
- **Contact Unsubscribed Campaign:** Triggered when a contact unsubscribes from a campaign.

### Meeting Events

- **Meeting Scheduled:** Triggered when a meeting is booked.
- **Meeting Cancelled:** Triggered when a meeting is cancelled.
- **Meeting Rescheduled:** Triggered when a meeting is rescheduled.

### Other Events

- **New Page Visit:** Triggered when a new page visit is recorded.
- **Event Created:** Triggered when a new event type is created.

Failed webhook deliveries are retried up to 3 times with increasing intervals (1h, 3h, 6h, 24h). A `410 Gone` response automatically disables the webhook. Webhooks are disabled after 3 consecutive failed retries.
