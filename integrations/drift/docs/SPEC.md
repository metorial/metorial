# Slates Specification for Drift

## Overview

Drift (now part of Salesloft) is a conversational marketing and sales platform that provides live chat, chatbots, meeting scheduling, and visitor engagement tools for websites. It enables businesses to communicate with website visitors in real time and route leads to sales teams. The API allows managing contacts, conversations, messages, accounts, users, playbooks, meetings, and teams.

## Authentication

Drift supports two authentication methods:

### 1. OAuth 2.0 Authorization Code Flow (for public apps)

Drift uses the OAuth 2.0 Authorization Code flow to give you the credentials you need to talk to Drift on a user's behalf.

**Authorization URL:** `https://dev.drift.com/authorize`

- Parameters: `response_type=code`, `client_id`, `redirect_uri`, `state`

**Token Exchange URL:** `https://driftapi.com/oauth2/token`

- Parameters (POST, `application/x-www-form-urlencoded`): `client_id`, `client_secret`, `code`, `grant_type=authorization_code`
- Returns: `access_token` (expires in 7200 seconds), `refresh_token`, `orgId`

**Token Refresh URL:** `https://driftapi.com/oauth2/token`

- Parameters: `client_id`, `client_secret`, `refresh_token`, `grant_type=refresh_token`

Requests are authenticated via the header: `Authorization: Bearer <access_token>`

**Available Scopes:**

| Scope                | Description                                      |
| -------------------- | ------------------------------------------------ |
| `contact_read`       | Listen to changes to contacts and query contacts |
| `contact_write`      | Create and update contacts                       |
| `conversation_read`  | Query conversations and messages                 |
| `conversation_write` | Create messages via a bot                        |
| `user_read`          | Read user data                                   |
| `user_write`         | Modify user data                                 |
| `gdpr_read`          | Perform data retrieval requests                  |
| `gdpr_write`         | Perform data deletion requests                   |

### 2. Personal Access Token (for private apps)

For private apps you can simply use the private token, which is specifically for your Drift account, generated through the quick start guide. You can authenticate your requests by including the header `Authorization: Bearer YOUR_TOKEN`. This token does not expire and does not require the OAuth flow. Scopes are still configured on the app settings page.

**Base URL:** `https://driftapi.com`

## Features

### Contact Management

Contacts in Drift are the main storage object for data associated with people external to your organization, created as soon as Drift captures identifying information about the individual. You can create, retrieve, update, and delete contacts. Contacts support custom attributes, email unsubscription, and timeline event posting. Contacts can be looked up by email or Drift ID.

### Conversation and Messaging

Conversations are the core object in Drift, representing a series of messages exchanged between a single contact and a group of participants. You can create new conversations, send messages (as a bot), retrieve conversation details, list conversations, get message history, export transcripts, and retrieve attachments. Conversation statuses can be queried in bulk.

### User (Agent) Management

The Users API enables read access to information on users/agents in Drift, including current availability, user name, email, and whether the user is a bot. Users can also be updated. You can retrieve booked meetings for specific users.

### Account Management

Accounts in Drift are used for personal account tracking and ABM (account-based marketing) purposes in the context of playbooks for custom targeting. You can create, retrieve, list, update, and delete accounts.

### Playbooks (Read-Only)

Playbooks are automated message workflows and campaigns that proactively reach out to site visitors. The Playbooks API allows you to retrieve active and enabled playbooks, as well as conversational landing pages, but editing is only available in the Drift UI.

### Team Management

You can list all teams in an organization and list teams associated with a specific user.

### Meeting Management

You can retrieve booked meetings for agents. Meeting data includes scheduling details, slot times, and associated conversation context.

### Data Privacy (GDPR)

Drift admins can manually request data retrieval and deletion, but the Data Privacy API provides a way to trigger GDPR requests programmatically.

### SCIM 2.0 User Provisioning

IT admins can provision and manage user accounts with the Drift SCIM 2.0 API, used by SSO services and identity providers to manage people across tools. Supports searching, provisioning, updating, and deprovisioning users.

### App Administration

Admins can trigger a remote app uninstall on behalf of a client, as well as retrieve token information and metadata including the org, scopes, and app for a token.

## Events

Drift supports webhooks that deliver real-time event notifications via HTTP POST requests to a configured URL. Webhooks are configured in the app settings on dev.drift.com, where you provide a request URL and choose the events to subscribe to. A Verification Token is provided under App Credentials to verify that data sent to your endpoint is actually from Drift.

### Conversation Events

- **New Conversation** (`new_conversation`): Fires when a site visitor starts a new conversation (not bot-initiated). Requires `conversation_read` scope.
- **New Message** (`new_message`): Fires when a new message is created in any conversation. Requires `conversation_read` scope.
- **New Command Message** (`new_command_message`): Fires when a slash-command message is received (e.g., `/msg`). A filtered version of `new_message` for apps that only care about trigger phrases. Requires `conversation_read` scope.
- **Conversation Push** (`conversation_push`): Combined event indicating a conversation is ready for third-party consumption, triggered by either inactivity timeout or manual push. Requires `conversation_read` scope.
- **Conversation Inactive** (`conversation_inactive`): Fires when no messages have been sent in a conversation for a configurable period. The timeout is configurable in advanced conversation settings. Requires `conversation_read` scope.
- **Conversation Manual Push** (`conversation_manual_push`): Fires when a conversation is closed or manually synced by a user. Requires `conversation_read` scope.
- **Conversation Participant Added/Removed** (`conversation_participant_added`, `conversation_participant_removed`): Fires when participants are added to or removed from a conversation. Requires `conversation_read` scope.
- **Button Clicked** (`button_clicked`): Fires when a button is clicked within a conversation. Requires `conversation_read` scope.

### Contact Events

- **Contact Identified** (`contact_identified`): Fires only for contacts that have provided their email in chat. Requires `contact_read` scope.
- **Contact Updated** (`contact_updated`): Fires when a contact record is updated in Drift. Requires `all_contact_read` scope. Supports granular field-level subscriptions.
- **Phone Captured** (`phone_captured`): Fires when a phone number is provided in a conversation. Requires `conversation_read` scope.

### Meeting Events

- **New Meeting** (`new_meeting`): Fires when a meeting is booked by a contact or site visitor with a team member. Requires a calendar connection in Drift. Requires `conversation_read` scope.
- **Meeting Updated** (`meeting_updated`): Fires when a meeting is rescheduled or canceled. Requires `conversation_read` scope.

### Playbook Events

- **Playbook Goal Met** (`playbook_goal_met`): Fires when a previously identified contact meets a goal within a playbook. Includes contact ID, playbook name, and goal name. Requires `conversation_read` scope.

### User Events

- **User Availability Updated** (`user_availability_updated`): Fires when a Drift user's availability changes (Online, Away, Available). Requires `user_read` scope.
- **User Unsubscribed** (`user_unsubscribed`): Fires when a user unsubscribes from all emails. Requires `user_read` scope.

### Chat to Call Events

- **Chat to Call** (`chat_to_call`): Fires when a Drift user completes a phone call through Drift's Chat to Call feature. Includes call details like duration, type (phone bridge or browser call), and participant info. Requires `conversation_read` scope.

### Administrative Events

- **GDPR Delete Requested** (`gdpr_delete_requested`): Fires when a GDPR deletion is requested for a contact. Requires `gdpr_read` scope.
- **App Disconnected** (`app_disconnected`): Fires when a Drift organization disconnects your app. No scope required.
