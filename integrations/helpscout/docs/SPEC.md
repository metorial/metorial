Now let me get the specific webhook events and the Mailbox API details:Now I have comprehensive information. Let me also check on the Docs API authentication since it uses a different method:

# Slates Specification for Help Scout

## Overview

Help Scout is a customer support platform that provides shared inboxes (mailboxes), a knowledge base (Docs), live chat (Beacon), and reporting tools. It offers two main APIs: the Inbox API (Mailbox API 2.0) for managing conversations, customers, and mailboxes, and the Docs API for managing knowledge base content. API access is only available on paid plans.

## Authentication

Help Scout provides two separate APIs with different authentication mechanisms:

### Inbox API (Mailbox API 2.0)

This is an HTTPS-only API that uses OAuth 2.0 authorization, implementing Authorization Code and Client Credential flows.

Before using either flow, you need to create an OAuth2 application by navigating to Your Profile > My Apps and clicking Create My App. This provides you with a Client ID (Application ID) and Client Secret.

**Authorization Code Flow** (for third-party integrations used by other Help Scout users):

1. Redirect the user to the authorization URL: `https://secure.helpscout.net/authentication/authorizeClientApplication?client_id={application_id}&state={your_secret}` (the `state` param is optional).
2. After the user authorizes, they are redirected back to your Redirection URL with a `code` parameter.
3. Exchange the code for tokens at: `POST https://api.helpscout.net/v2/oauth2/token` with `grant_type=authorization_code`, `code`, `client_id`, and `client_secret`.
4. The response includes an `access_token`, `refresh_token`, and `expires_in` (172800 seconds / 2 days).
5. When the access token expires, use `grant_type=refresh_token` at the same token endpoint with the `refresh_token`, `client_id`, and `client_secret`.

**Client Credentials Flow** (for internal integrations):

The Client Credentials flow is meant for internal integrations. All credentials must be associated with an active, invited user in the Help Scout account.

- `POST https://api.helpscout.net/v2/oauth2/token` with `grant_type=client_credentials`, `client_id`, and `client_secret`.

All API requests are authenticated via the Authorization header: `Authorization: Bearer {access_token}`.

Help Scout's OAuth 2.0 implementation does not use granular scopes — access is determined by the role of the associated user.

### Docs API (v1)

Each API key is associated with a Help Scout user. Results returned from various responses are based upon the role of the user to which the API key is tied. The API key is passed via HTTP Basic Authentication and goes in the username field. A dummy password, such as X, goes in the password field.

API keys can be generated under Your Profile > Authentication > API Keys in the Help Scout dashboard.

## Features

### Conversation Management

Create, read, update, and delete support conversations across mailboxes. Conversations can be of various types including email, chat, and phone. You can manage conversation status (active, pending, closed, spam), assign conversations to users or teams, merge conversations, move them between mailboxes, and perform bulk updates on tags and custom fields.

### Thread Management

Add replies, notes, and other thread types to conversations. Agent replies send actual emails to customers. Notes are internal-only communications not visible to the customer. You can also manage attachments on threads.

### Customer Management

Create and manage customer profiles including their contact information (emails, phone numbers, addresses, social profiles, chat handles, and websites). Customers can have custom properties. You can search and list customers and manage their associated organizations.

### Organization Management

Create and manage company/organization records. Organizations can be associated with multiple customers and can have custom properties.

### Mailbox Management

Read mailbox configuration including folders and custom fields. Mailboxes represent shared inboxes where conversations are received and managed.

### Tags

Create, update, and delete tags used to categorize and organize conversations.

### Teams

List and manage teams of users within the Help Scout account.

### User Management

List and retrieve users (agents/staff) in the account. View user information and current availability status.

### Workflows

List, activate, deactivate, and manually run workflows (automation rules). Workflows can be applied to specific sets of conversations.

### Knowledge Base (Docs API)

Manage Docs sites, collections, categories, and articles. Create, update, and delete help articles. Manage the structure and organization of your knowledge base content.

- Uses a separate API (`https://docsapi.helpscout.net/v1/`) with its own authentication (API key via Basic Auth).

### Reporting

Access various reports and metrics including company-level statistics, user productivity stats, conversation volume and response time metrics, and customer satisfaction ratings. Reports can be filtered by date ranges and other parameters.

### Chat (Beacon)

Manage chat conversations initiated through the Beacon widget. Retrieve chat history and details.

### Satisfaction Ratings

Access customer satisfaction ratings associated with conversations.

## Events

Webhooks enable Help Scout to call a script on your server when one or more events have happened. Configuring webhooks can be done through the Help Scout user interface or programmatically via the Inbox API. Each webhook requires a callback URL and a secret key used for HMAC-SHA1 signature verification via the `X-HelpScout-Signature` header. Webhooks support payload version V2.

### Conversation Events

Triggered when conversations are modified. Available events include:

- **Assigned** (`convo.assigned`) — a conversation is assigned to a user.
- **Created** (`convo.created`) — a new conversation is created.
- **Created via AI Answers** (`convo.ai-answers.created`) — a conversation is created through AI Answers.
- **Deleted** (`convo.deleted`) — a conversation is deleted.
- **Merged** (`convo.merged`) — two conversations are merged.
- **Moved** (`convo.moved`) — a conversation is moved to another mailbox.
- **Status Updated** (`convo.status`) — a conversation's status changes.
- **Tags Updated** (`convo.tags`) — tags on a conversation are modified.
- **Custom Fields Updated** (`convo.custom-fields`) — custom field values are changed.
- **Customer Reply** (`convo.customer.reply.created`) — a customer replies to a conversation.
- **Agent Reply** (`convo.agent.reply.created`) — an agent replies to a conversation. The Agent Reply event will only return data for User-generated threads.
- **Note Created** (`convo.note.created`) — an internal note is added to a conversation.

### Customer Events

Triggered when customer records change:

- **Created** (`customer.created`) — a new customer is created. The customer.created webhook event is not filterable across specific inboxes, and will trigger on all customers created globally.
- **Updated** (`customer.updated`) — a customer record is updated.
- **Deleted** (`customer.deleted`) — a customer is deleted.

### Satisfaction Rating Events

- **Rating Received** (`satisfaction.ratings`) — a customer submits a satisfaction rating.

### Beacon Chat Events

- **Chat Created** (`beacon.chat.created`) — a new Beacon chat is started.
- **Customer Replied** (`beacon.chat.customer.replied`) — a customer sends a message in a Beacon chat.

### Tag Events

- **Created** (`tag.created`) — a new tag is created.
- **Updated** (`tag.updated`) — a tag is updated.
- **Deleted** (`tag.deleted`) — a tag is deleted.

### Organization Events

- **Created** (`organization.created`) — a new organization is created.
- **Updated** (`organization.updated`) — an organization is updated.
- **Deleted** (`organization.deleted`) — an organization is deleted.

### User Status Events

- **User Status Changed** (`user.status.changed`) — a user's availability status changes.

### Survey Response Events

- **Survey Response Received** (`message.survey.response.received`) — a survey response is submitted.
