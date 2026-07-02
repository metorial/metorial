# Slates Specification for Zixflow

## Overview

Zixflow is an AI-powered CRM and multichannel messaging platform that enables businesses to manage contacts, send campaigns via WhatsApp, SMS, RCS, and Email, and automate workflows. It combines customer data management (collections, lists, records) with communication capabilities and activity/task tracking in a unified workspace.

## Authentication

Zixflow uses **API Key authentication** via Bearer tokens.

**How to obtain an API key:**

1. Log in to the Zixflow dashboard.
2. Navigate to **Settings > Workspace Settings > Developer > API Keys**.
3. Click **Create an API** (or **+ Add New**).
4. Configure the API key settings:
   - **Permissions**: Define which API endpoints and actions the key can access.
   - **Expiry** (optional): Set an expiration date for the key.
   - **IP Restriction** (optional): Restrict usage to specific IP addresses.
5. Copy the generated API key.

**Usage:**

Include the API key as a Bearer token in the `Authorization` header of each request:

```
Authorization: Bearer your_api_key
```

The base URL for all API requests is `https://api.zixflow.com`.

Note: Some legacy SMS endpoints also accept the API key as a query parameter (`apiKey`), but the Bearer token method is the standard approach for all other endpoints.

## Features

### WhatsApp Messaging

Send messages via WhatsApp using pre-approved templates or free-form direct messages. Supports template management (listing accounts, templates, and template variables), authentication templates (for OTP delivery), and rich media messages. Requires a connected WhatsApp Business Account (WABA) through Meta.

### RCS Messaging

Send Rich Communication Services (RCS) messages using templates or direct messages. Supports text, images, videos, documents, carousels, and interactive buttons. Requires an RCS bot ID.

### SMS Messaging

Send transactional or promotional SMS messages. Configurable options include sender ID, route (transactional/promotional), flash SMS, and DLT template/entity IDs (required for India). Supports a `reportUrl` parameter to receive delivery reports via HTTP POST.

### Email Messaging

Send emails with support for HTML content and attachments. Attachments can be uploaded separately and referenced when sending. Supports configuring sender name, reply-to address, and subject.

### OTPflow

A dedicated OTP delivery API that sends one-time passwords with intelligent multi-channel fallback (e.g., if SMS fails, it can automatically fall back to WhatsApp, RCS, or Email).

### Campaign Reporting

Retrieve delivery reports for sent messages across WhatsApp, SMS, and Email channels. Reports provide message status and delivery details.

### Collections and Records

Collections are customizable data containers (similar to database tables) in the CRM. You can retrieve collections, and perform full CRUD operations on collection records. Records support filtering and sorting with dynamic attributes. Useful for managing contacts, deals, or any custom business data.

### Lists and List Entries

Lists are another organizational structure for grouping data. You can retrieve lists and perform full CRUD operations on list entries. The structure of list entries is dynamic and varies depending on the list's configured attributes.

### Attributes

Manage custom attributes (fields) on collections and lists. Supports creating, reading, updating, and deleting custom attributes. Attributes have configurable options and status settings.

### Activities / Tasks

Manage activities and tasks associated with records. Supports creating, retrieving, updating, and deleting activities. Useful for tracking follow-ups, calls, meetings, and other tasks tied to CRM records.

### Workspace Members

Retrieve information about workspace members, including their names, emails, and roles. Read-only access to member data.

## Events

Zixflow supports webhooks that push real-time notifications to a user-specified endpoint via HTTP POST with a JSON body. Webhooks are configured in the Zixflow dashboard under **Settings > Developer > Webhook**. When creating a webhook, you specify a name, endpoint URL, the actions (events) to listen for, and the webhook type.

### Incoming WhatsApp Messages

Triggered when a new WhatsApp message is received on your connected account (`incoming.whatsapp.message`). Supports various message types: text, image, video, audio, document, location, contacts, button replies, interactive flow form responses, and product orders. Includes sender information (name, phone number) and Meta identifiers (phone ID, WABA ID, message ID).

### Incoming RCS Messages

Triggered when a new RCS message is received (`incoming.rcs.message`). Supports message types: text, quick reply buttons, image, video, audio, file, and location. Includes sender phone number and RCS bot ID.

### SMS Delivery Reports

When sending SMS, a `reportUrl` can be specified per message. Zixflow will POST delivery status reports to that URL when the message status changes. This is configured per-message rather than as a global webhook.

### General Data Change Webhooks

Zixflow supports workspace-level webhooks that notify your endpoint about changes to your data (e.g., CRM records, list entries). These are configured in the Developer settings by selecting specific actions to monitor. Exact event types are selected during webhook creation in the dashboard.
