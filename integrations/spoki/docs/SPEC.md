Now let me fetch the full webhook events page for more details:Now I have comprehensive information to write the specification.

# Slates Specification for Spoki

## Overview

Spoki is an Italian WhatsApp Business API platform that enables businesses to use WhatsApp as a channel for marketing, sales, and customer support. It is a comprehensive WhatsApp Business API platform that provides contact management, message template creation, bulk campaigns, automation workflows, chatbots, a shared team inbox, deal/pipeline management, and AI-powered features. Spoki is an official Meta Tech Partner.

## Authentication

Spoki uses API key-based authentication. The API key is provided as the `X-Spoki-Api-Key` header.

To obtain an API key:

1. Log into your Spoki account, navigate to Integrations in the main menu, and select "API".
2. Click the option to request an API key and provide a brief description of your use case.
3. The API key requires manual approval from Spoki, and you will receive an email regarding the outcome within a maximum of 48 hours.

For embedding Spoki or obtaining session tokens, a secondary authentication flow exists:

- Make a POST request to `https://app.spoki.it/api/1/auth/get_authentication_token/` with the `X-Spoki-Api-Key` header, plus a JSON body containing `email` and `private_key`. This returns a `token` and `uid` for session-based access.
- The Private Token (private_key) is associated with a specific user of your account.

The base API endpoint is `https://app.spoki.it/api/1/`. The API is structured around REST, HTTP, and JSON.

## Features

### Contact Management

The API is organized around resources such as contacts or deals. You can create, update, and delete contacts. Contacts are identified primarily by phone number (E.164 format). Contacts can be segmented with tags, filters, and dynamic (custom) fields. Contacts can be organized into lists, and CSV imports are supported via the platform.

### Messaging

The API allows you to send messages on WhatsApp or start automations whenever you want. Two approaches are available:

- **Send Message API**: Should be used only for one-off, non-templated messages where automation is unnecessary.
- **Start Automation API**: The recommended method for sending messages. It triggers a pre-configured automation workflow that can include template messages and multi-step flows. Automations can handle large volumes efficiently and can include additional steps like follow-up actions.

Free-form messages can only be sent within 24 hours of the customer's last message; outside that window, only pre-approved WhatsApp template messages can be used.

- Template creation cannot be done via API; it must be done through the Spoki platform UI or an embedded interface.

### Automation Workflows

Automations are multi-step workflows triggered by various events (API calls, incoming messages, button clicks, scheduled times, external webhooks). Automations can be created with an API trigger via Automations > New > Trigger > Integrations > API. Each API-triggered automation generates a unique URL that can be called via POST to start the flow for a contact. When starting an automation for a contact, the platform automatically updates contact details during the process.

### Campaigns

A campaign allows scheduling the sending of a mass message to one or more contact lists at a specific date and time, suitable for promotional, informational, or service communications on a large scale. Campaigns require a Meta-approved template message.

### Deal Management

The Deals feature allows managing sales opportunities and tracking their progress through customizable pipelines, each deal representing a sales opportunity associated with one or more contacts. Deals include properties such as value, owner, stage, and expected close date. When Meta Conversion API is enabled, deals automatically send events to the connected Meta Pixel.

### Shared Inbox / Chat

The platform can be used as a shared WhatsApp inbox, allowing multiple people to manage the organization's WhatsApp conversations. Notes can be added to chats, and chats can be filtered by tags, agents, lists, or tickets.

### Embedding

Spoki can be embedded into third-party software via iframe. Using the authentication token endpoint, you can embed specific Spoki pages (e.g., chats) directly into your own application with auto-login, hidden branding, and navigation control.

### AI Features

Spoki integrates ChatGPT's AI with WhatsApp, enabling AI-powered chatbots that can respond to customers 24/7, generate message templates, summarize voice messages, and translate messages across languages.

## Events

Spoki supports outbound webhooks that can be configured in the Integrations section of the platform. You can activate the sending of webhooks to your management system for a number of events occurring on Spoki. Each webhook requires a Callback URL to which event notifications are sent via HTTP POST.

### Message Events

- **Message sent**: Notified when a message has been sent and each time its status is updated (e.g., delivered, read).
- **Message received**: Notified when a message has been received and each time it is updated.

### Chat Events

- **Chat unread messages**: Notified when a chat has unread messages or when it no longer has any (equivalent to the green badge on the platform).
- **Note added**: Notified when a note has been added to a chat.

### Contact Events

- **Contact created**: Notified when a contact is created.
- **Contact updated**: Notified when a contact is updated.
- **Contact deleted**: Notified when a contact is deleted.
- **Tag added to contact**: Notified when a tag is added to a contact.
- **Tag deleted from contact**: Notified when a tag is removed from a contact.
- **Contact added to list**: Notified when a contact is added to a list.
- **Contact deleted from list**: Notified when a contact is removed from a list.
- **ContactField created or updated**: Notified when a contact's custom field is created or updated.

Additionally, within automations, Spoki can send outbound webhook calls to external URLs as an automation step, allowing you to push data to external systems when contacts reach specific points in a workflow.
