# Slates Specification for Dailybot

## Overview

DailyBot is a team productivity platform that automates async check-ins (stand-ups), forms, peer recognition (kudos), and messaging across chat platforms like Slack, Microsoft Teams, Google Chat, and Discord. It provides a public API to programmatically manage these features and integrates with project management tools for activity tracking.

## Authentication

DailyBot uses **API Key-based authentication**.

The V1 API uses HTTP headers and unique API keys to authenticate requests.

**Obtaining an API Key:**

- You require the Org Administrator role.
- Navigate to Organization Settings, click "Integrations", go to the Integrations page, and click "Generate API Key".
- You can create as many API Keys as you need and revoke them at any moment.

**Using the API Key:**
The API key must be sent as an `X-API-KEY` HTTP header with each request. The base URL is `https://api.dailybot.com/v1/`.

**Key Context:**
An API Key includes both the organization and the key owner as context, meaning actions that require permissions or privacy checks will consider the actual permissions of the key owner.

**Exchange Tokens (Advanced):**
DailyBot supports an Exchange Token mechanism to make API calls on behalf of other users in the organization. This feature is disabled by default and must be requested via the support team.

## Features

### Check-in Management

Create, update, delete, and list check-ins (async stand-ups and recurring surveys). Check-ins are based on templates and can be configured with scheduling frequency, days of the week, custom trigger times, reminder settings, anonymity, privacy levels, and reporting channels. You can also retrieve check-in responses filtered by date range, and send manual reminders to participants who haven't responded.

- Check-ins can be set as trigger-based (manual only) or automatic with configurable recurring schedules.
- Up to 3 reminders can be configured per check-in with smart or fixed frequency modes.
- Responses include blocker indicators and completion status.

### Forms

List all forms visible to the API key owner. Forms support anonymous response collection, privacy settings, shortcuts, and date-bounded availability.

- Forms are read-only via the API (listing only); form creation is managed through the web interface.

### Templates

Retrieve templates for check-ins and forms, including their question definitions, logic flow, and intro/outro messages. Templates can be filtered by type (check-ins or forms) and whether they are system defaults.

### User Management

List, view, and update users in the organization. Configurable fields include full name, occupation, timezone, work days, work start time, time-off dates, active status, and bot enablement.

### Team Management

List teams, view team details, list team members, add users to teams, and remove users from teams. Teams can be marked as default across the organization.

### Messaging

Send messages to specific users, teams, or channels via the connected chat platform. Messages can include text, images, and interactive buttons. A separate endpoint allows sending emails to users.

- Group conversation creation is only supported in Slack, not other chat platforms.

### Kudos (Peer Recognition)

Give kudos to users on behalf of the API key owner or on behalf of DailyBot. Kudos can be associated with company values, sent anonymously, and directed to multiple receivers.

### Organization Info

Retrieve organization-level information including name, connected chat platform, supported domains, and platform configuration.

### Activity Ingestion

Add any user activity to DailyBot so it shows up in check-in reports or user activity feeds. Such activity can happen in any external context or app. This is done by posting to a unique Activity Hook URL.

## Events

DailyBot can deliver data to your application via WebHooks based on your organization's activity. Webhooks can be created via the web interface or the API. When creating a webhook, you must specify the endpoint URL, subscribe to event types, and optionally subscribe to specific objects (e.g., a particular check-in or form).

Webhook requests can be authenticated via a Bearer token (sent in an `X-BEARER` header), HTTPS Basic Authentication, or OAuth 2.0.

### Check-in Response Events

Triggered when a check-in response is completed, updated, or deleted by a team member. Privacy rules apply: anonymous responses will not include user information, and events are only sent if the subscriber has read permissions on the check-in.

- Events: `followups.response.completed`, `followups.response.updated`, `followups.response.deleted`

### Form Response Events

Triggered when a form response is created, updated, or deleted. Same privacy rules as check-in events apply.

- Events: `forms.response.created`, `forms.response.updated`, `forms.response.deleted`

### Kudos Events

Triggered when kudos are given to a user in the organization. The payload includes giver, receivers, content, and the related company value. Anonymous kudos will mask the giver's identity.

- Event: `kudos.posted`

### Organization Events

Triggered when user or team membership changes occur:

- User activated: triggered when an administrator changes a user's status to active.
- User deactivated: triggered when an administrator changes a user's status to inactive.
- Team user added: triggered when a user is added to a team by an org or team administrator.
- Team user removed: triggered when a user is removed from a team by an org or team administrator.

- Events: `organization.user_activated`, `organization.user_deactivated`, `organization.team_user_added`, `organization.team_user_removed`
