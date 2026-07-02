Let me get the full API documentation and webhook event types.Now let me get the full API reference to understand all features:Now I have enough information to write the specification.

# Slates Specification for Supportbee

## Overview

SupportBee's support ticket system enables teams to organize, prioritize and collaborate on customer support emails. It provides a shared inbox, knowledge base, customer portal, and ticket management capabilities. SupportBee integrates with 40+ third-party apps in project management, CRM, bug tracking, and more.

## Authentication

SupportBee uses **API Token Authentication**.

All API requests must have Content-Type and Accept headers set to `application/json`. Add the `auth_token` query parameter before sending an HTTP request to an endpoint.

To find your API token, click on your profile picture at the top left corner of your SupportBee desk and then click on "API Token".

In addition to the API token, you need your **company subdomain**. All API requests should be made to `https://[your-company].supportbee.com/`. For example, if your account URL address is `https://www.xyz.supportbee.com`, then your domain is `xyz`.

Example request:

```
https://{company}.supportbee.com/tickets?auth_token=your_api_token
```

All API endpoints except the Create Ticket endpoint require authentication.

**Required credentials:**

- **API Token**: Found in your SupportBee profile settings under "API Token".
- **Company subdomain**: The subdomain portion of your SupportBee account URL.

## Features

### Ticket Management

Create, retrieve, search, and manage support tickets. Tickets can be filtered by number of replies, assigned user, assigned team, starred status, label, and date range. Tickets can be archived, trashed, marked as spam, starred/unstarred, and deleted. Only admins can delete a trashed ticket.

### Replies and Comments

Retrieve all replies for a ticket, retrieve individual replies, and post new replies. Retrieve all comments on a ticket and create new comments. Comments are internal notes visible only to agents, while replies are sent to the customer.

### Ticket Assignment

Assign tickets to a user or group. Tickets can be assigned using a `user_id` for user assignment or `group_id` for group assignment.

### Labels

Retrieve all custom labels for a company. Add labels to and remove labels from tickets. Labels can be used for categorization and priority management.

### Users and Teams

Retrieve all confirmed agents of the company and retrieve individual agents. Manage groups (create, update, list members, add members). List teams.

### Snippets

Snippets are saved response templates for frequently asked questions or common reply content. The API allows listing, creating, updating, and deleting snippets.

### Filters (Automation Rules)

A filter is composed of two parts — a rule and a consequence. Rules dictate which tickets are matched and consequences decide what action is taken on the ticket. Rules can match on requester email, delivered-to address, subject, and body. Consequences can apply labels, assign to users or teams, archive, or mark as spam.

### Email Management

Retrieve and create email addresses (forwarding addresses) associated with the SupportBee account.

### Reports

Access support performance metrics such as response times and ticket resolution data.

### Attachments

Upload and attach files to tickets.

## Events

SupportBee supports webhooks that send HTTP POST notifications to a specified URL when events occur. The permission to create and delete webhook integrations is restricted to system admins. Webhooks are configured via the SupportBee admin interface under the Web Hooks tab. If the response is a failure, the call will be retried 3 times at an interval of an hour.

### Ticket Lifecycle Events

Notifications for core ticket state changes:

- **New Ticket Created** — Triggered when a new ticket is created.
- **Ticket Archived / Unarchived** — Triggered when a ticket is archived or restored.
- **Ticket Trashed / Untrashed** — Triggered when a ticket is moved to or restored from trash.
- **Ticket Spammed / Unspammed** — Triggered when a ticket is marked or unmarked as spam.
- **Ticket Answered / Unanswered** — Triggered when a ticket's answered status changes.

### Reply and Comment Events

Notifications for new communication on tickets:

- **New Customer Reply Created** — Triggered when a customer replies to a ticket.
- **New Agent Reply Created** — Triggered when an agent replies to a ticket.
- **New Comment Created** — Triggered when an internal comment is added to a ticket.

### Assignment Events

Notifications for ticket assignment changes:

- **Ticket Assigned to User / Unassigned from User** — Triggered when a ticket is assigned to or unassigned from a specific user.
- **Ticket Assigned to Team / Unassigned from Team** — Triggered when a ticket is assigned to or unassigned from a team.
