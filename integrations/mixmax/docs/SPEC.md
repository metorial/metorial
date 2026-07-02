Now I have enough information to create the specification. Let me compile it all.

# Slates Specification for Mixmax

## Overview

Mixmax is a sales engagement platform that operates as a Gmail extension, providing email tracking, sequences (automated email campaigns), templates, polls, meeting scheduling, and CRM integration. It offers a REST API for programmatic access to manage contacts, sequences, messages, meetings, and reporting data.

## Authentication

Mixmax uses **API token authentication**. There is no OAuth2 flow.

- **How to obtain a token:** Generate a developer API token in Mixmax Settings → Integrations. Click "Create Mixmax API Token" and copy the token. The token is only shown once.
- **Plan requirement:** API access is restricted to annual Growth+ or Enterprise plans.
- **Base URL:** `https://api.mixmax.com/v1/`

The API token can be provided in two ways:

1. **HTTP Header (recommended):** Pass the token as the `X-API-Token` header.

   ```
   X-API-Token: 45e99c6b-386d-4aa1-a2b4-296568a40ff2
   ```

2. **Query parameter:** Pass the token as the `apiToken` query string parameter.
   ```
   https://api.mixmax.com/v1/users/me?apiToken=YOUR_TOKEN
   ```

The token is scoped to the individual user who generated it. There is no workspace-level authentication — each user must generate their own token.

## Features

### Sequences (Automated Campaigns)

Manage automated multi-step email sequences. List available sequences, search sequences, add recipients to a sequence with custom variables (e.g., personalization fields), cancel sequences for specific recipients, and view sent sequence data. Sequences can be organized into folders.

### Messages & Sending Email

Create, read, update, and send individual email messages. Supports composing messages with recipients (to, cc, bcc), subjects, and HTML bodies. Also provides a test-send capability for previewing emails.

### Contacts & Contact Groups (Deprecated)

Manage contacts (people you've emailed via Mixmax), including creating, updating, deleting, and searching contacts. Contacts can be organized into contact groups. Notes can be attached to individual contacts. Note: The contacts API is marked as deprecated.

### Templates (Snippets)

Manage reusable email templates. Create, read, update, and delete templates. Templates can be organized using tags (snippet tags). Templates can also be sent directly via the API.

### Meeting Scheduling

Manage appointment links and meeting types for calendar scheduling. Create and configure meeting types, view meeting invites, and access meeting summaries and transcripts. Appointment links allow recipients to self-book time on your calendar.

### Polls & Q&A

Access poll results and Q&A responses embedded in emails. View individual poll/Q&A results including vote data and respondent information.

### Live Feed

Access the live feed of email activity events (opens, clicks, replies, etc.). Supports saved searches to filter live feed events.

### Insights & Reporting

Create and manage insights reports for email analytics. Also supports querying tabular report data for custom analysis.

### Rules (Webhooks)

Create and manage rules that intercept real-time events and route them to webhooks or trigger actions. Rules support event-based triggers (e.g., email sent, opened, clicked) and time-based (recurring) triggers. Filters using a Sift-based domain-specific language allow matching on specific event properties. Each rule can have one or more associated actions.

### Salesforce Integration

Interact with Salesforce data directly through Mixmax, including managing Salesforce accounts, contacts, leads, opportunities, and tasks. Supports searching, creating, reading, and updating Salesforce records. Requires a connected Salesforce account.

### Unsubscribes

Manage the list of unsubscribed email addresses. Add or remove addresses from the unsubscribe list.

### File Requests

View file request data — instances where a recipient was asked to upload a file via email.

### User Preferences & Profile

Read and update the authenticated user's preferences and profile information.

### Message Integrations (Enhancements, Slash Commands, Link Resolvers, Sidebars)

Register and manage custom integrations that extend the Mixmax compose window. Includes enhancements (interactive content like polls or availability inserted via the Enhance menu), slash commands (content inserted via "/" commands), link resolvers (rich previews for URLs), and sidebar widgets.

### Teams

Create and manage teams within a Mixmax workspace, including adding and removing team members.

## Events

Mixmax supports outgoing webhooks through its **Rules** system. Rules intercept real-time events, evaluate optional filter conditions, and route matching events to a configured webhook URL or other action.

### Message Events

- **message:sent** — Fires when an email is sent. Includes recipient list, subject, body, and message metadata.
- **message:received** — Fires when an email reply is received. Includes sender info, subject, body, and thread information.

### Engagement Events

- **opened** — Fires when a recipient opens a tracked email. Includes recipient info, user agent, timestamp, and IP address.
- **clicked** — Fires when a recipient clicks a tracked link. Includes the link URL, link text, and recipient info.
- **downloaded** — Fires when a recipient downloads an attached file. Includes the file name and recipient info.

### Poll & Survey Events

- **poll:voted** — Fires when a recipient votes on a poll embedded in an email. Includes the poll question, options, selected vote, and respondent info.

### Meeting Events

- **meetinginvites:confirmed** — Fires when a recipient confirms a meeting invitation. Includes the selected timeslot, organizer details, guest info, and meeting title.

### Unsubscribe Events

- **unsubscribe:created** — Fires when a recipient clicks an unsubscribe link. Includes the recipient email, message ID, and sequence ID.

### Incoming Webhooks

Mixmax also supports **incoming webhooks**, allowing external systems to push data into Mixmax to trigger actions such as adding recipients to a sequence, adding contacts to a list, or sending an email. Incoming webhooks are configured via the Rules UI and accept JSON payloads with at minimum an `email` field.
