Now let me get the full list of webhook event types:Now I have comprehensive information. Let me also check on the concepts like Pods, custom domains, semantic search, and labels:Now I have all the information needed. Let me compile the specification.

# Slates Specification for Agent Mail

## Overview

AgentMail is an API platform for giving AI agents their own inboxes to send, receive, and act upon emails, allowing agents to assume their own identity and communicate via email with services, people, and other agents. There is no inbox to open in a browser — all operations are performed entirely through the API.

## Authentication

AgentMail uses straightforward API key authentication. You include your key in requests and you're done.

Authentication uses Bearer token format: `Bearer <token>`, where token is your API key.

API keys are obtained from the AgentMail Console at `https://console.agentmail.to`. Get your API key from the Console — if you don't have an account yet, you can sign up directly from the console. Once you're logged in, you'll be able to manage your inboxes, view analytics, and create API keys.

API keys are prefixed with `am_`. The key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer am_your_api_key_here
```

The base URL for all API requests is `https://api.agentmail.to/v0/`.

You can create scoped API keys that are restricted to a single pod. A scoped key can only access resources within its pod. This is useful for multi-tenant setups.

## Features

### Inbox Management

The core of AgentMail is the ability to create, manage, and operate email inboxes entirely via API. You can spin up new inboxes programmatically, assign custom domains for branded identities, manage conversation threads and replies, and handle attachments.

- Inboxes are created with an optional username, domain, and display name. The domain parameter is optional. If not provided, AgentMail will use the default `@agentmail.to` domain. Custom domains require a paid plan.
- Each inbox belongs to one agent and is used for all email activity.
- A `client_id` parameter can be passed to make inbox creation idempotent.

### Sending & Receiving Email

AgentMail lets AI agents send, receive, and reply to emails using an API. Each agent gets its own inbox.

- Messages support `to`, `cc`, `bcc`, `reply_to`, `subject`, plain text body, HTML body, attachments, custom headers, and labels.
- Agents can reply to emails using the same inbox. Replies stay linked to the original email.
- When receiving emails, messages include `extracted_text` and `extracted_html` for reply content without quoted history.
- AgentMail handles the basic email setup needed to send messages. It supports SPF, DKIM, and DMARC, so email identities work without extra steps.

### Threading

AgentMail provides built-in threading via API with comprehensive Message-ID, In-Reply-To, and References email headers.

- AgentMail keeps emails grouped as conversations. This helps agents continue the same email discussion without starting over.
- Threads can be listed, filtered by labels, and queried per inbox.

### Labels

Labels are simple, string-based tags that you can attach to Messages and Threads. They are the primary mechanism for organizing, categorizing, and managing the state of your conversations. A Message can have multiple Labels.

- Labels can be attached at send time or added/modified later via update.
- You can list Threads, Messages, and Drafts by filtering for one or more Labels, allowing you to create highly targeted queries.

### Drafts

AgentMail supports creating and managing email drafts within inboxes before sending.

### Semantic Search

AgentMail provides semantic search to search across all inboxes in your organization by meaning.

### Structured Data Extraction

AgentMail can pull structured data from unstructured emails. Every email is automatically parsed into structured JSON format.

### Automatic Labeling

AgentMail supports automatic labeling, which can automatically categorize emails with user-defined prompts.

### Custom Domains

Custom domains are supported on paid plans. You can assign branded domains like `agent@yourcompany.com` to your AI agents. Domain verification is done via DNS records (SPF, DKIM, DMARC).

### Pods (Multi-Tenancy)

AgentMail offers a feature called "pods." A pod groups inboxes and domains for a single customer, user, or agent. Everything in a pod is kept separate, so email data doesn't mix with other pods. This makes it easy to run multi-tenant systems.

- When you sign up, you are automatically created a Default Pod, and all resources created whether its Inboxes or Domains are all associated with this Default Pod.
- Pods can contain inboxes, domains, and other resources. Scoped API keys can be created per pod.
- You cannot delete a Pod that has existing children resources. Make sure to delete any existing Inboxes or Domains before deleting a Pod.

### Lists

AgentMail supports contact/mailing list management as a core concept within the API.

### IMAP & SMTP

AgentMail provides IMAP and SMTP access for inboxes, enabling compatibility with traditional email clients and protocols alongside the REST API.

## Events

AgentMail supports seven webhook event types. When creating a webhook, you can subscribe to specific events or receive all of them. AgentMail also delivers email events via WebSockets for real-time streaming.

Webhooks are registered via the API by specifying an endpoint URL, event types, and optionally scoping to specific pod IDs or inbox IDs. A secret is provided for webhook signature verification. Omit `event_types` to subscribe to all event types.

### Message Events

- **`message.received`** — Triggered when a new email is received and processed in one of your inboxes. This is the primary event for triggering agent workflows. It is the only event that includes both full message and thread data in the payload.
- **`message.sent`** — Triggered when a message is successfully sent from one of your inboxes. Useful for tracking outgoing messages or triggering follow-up workflows.
- **`message.delivered`** — Triggered when a sent message is successfully delivered to the recipient's mail server. Confirms delivery but does not guarantee inbox placement.
- **`message.bounced`** — Triggered when a sent message fails to deliver and bounces back. Includes bounce type and sub-type information.
- **`message.complained`** — Triggered when a recipient marks your message as spam or files a complaint.
- **`message.rejected`** — Triggered when a message is rejected before being sent, typically due to validation errors or policy violations.

### Domain Events

- **`domain.verified`** — Triggered when a custom domain is successfully verified and ready to use for sending emails.
