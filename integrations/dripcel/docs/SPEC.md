The search results about webhooks are mostly about "Drip" (DripEmail), not "Dripcel". Let me search specifically for Dripcel's hooks/webhooks.Based on the Dripcel docs, hooks are actions triggered when a contact replies to a send from a campaign, with 2 hook types available. The docs mention "webhook template" in the send logs documentation context. Let me check what the two hook types are - the docs reference mentions webhooks as one type. Based on all the information gathered, I can now compile the specification.

# Slates Specification for Dripcel

## Overview

Dripcel is a cloud-based SMS and email marketing automation platform that uses machine learning to optimize campaign delivery timing, content, and targeting. It also operates as a real-time campaign exchange for performance marketing, with built-in compliance, lead verification, and contact management. The platform serves businesses in markets including the US, UK, Australia, and South Africa.

## Authentication

Dripcel uses **API key** authentication. All API endpoints require authentication.

1. Log into your Dripcel account and navigate to the [API keys page](https://app.dripcel.com/api-keys).
2. Click **Generate Key** to create a new API key.
3. Pass the key as a Bearer Token in the `Authorization` header:

```
Authorization: Bearer <your_api_key>
```

**Permissions:** API keys have configurable, role-based permissions. By default, keys inherit the permissions of the creating user. Permissions are granular and hierarchical — for example, `contact.update.tag_ids` is nested under `contact.update`. Always assign the minimum permissions needed.

The base URL for all API requests is `https://api.dripcel.com`.

## Features

### Contact Management

Manage your contact database programmatically. You can look up individual contacts by cell number, search contacts using filters (cell numbers, tags, date ranges), upload new contacts (up to 100,000 per request for create-only, or 20,000 for upsert), bulk update contacts by adding/removing tags or deduplication IDs, delete contacts, and manage opt-outs from specific or all campaigns. Contacts support custom fields (e.g., `c1`, `c2`) and can be tagged for segmentation. You can optionally trigger an SMS send immediately upon uploading contacts.

### SMS Sending

Send individual SMS messages to contacts. Each send requires content, a cell number, country code, and a delivery method (`reverse`, `standard`, or `transactional`). Messages can include template variables for personalized content when sending to existing contacts. A test mode is available via send options. Each send returns a unique `customerId` for tracking delivery status.

### Bulk Email Sending

Send bulk emails to multiple recipients using pre-defined email templates. You specify a sender address, a template ID, and a list of destination email addresses. Emails can be scheduled for future delivery. Non-contact addresses can optionally be filtered out, which is required when using templates with custom fields.

### Email Templates

List all email templates stored in your Dripcel account. Templates are referenced by ID when sending bulk emails.

### Campaign Management

View all campaigns or retrieve details of a specific campaign. Campaigns are central to organizing sends, tracking performance, and associating contacts.

### Delivery Tracking

Query delivery statuses for sent messages. Deliveries can be looked up by contact cell number or by the unique `customerId` returned from a send operation. At least one of these parameters must be provided.

### Send Logs

View metadata about past sends, including the campaign, template used, trigger type, delivery start time, and destination count. Send logs can be searched by campaign ID and delivery date range.

### Replies

Search and view replies received from contacts. Replies are classified by kind: `optIn`, `optOut`, or `unknown`. You can search replies by campaign, contact number, reply content, date range, and classification type.

### Sales Tracking

Upload sale conversions to Dripcel, either in bulk via POST or as individual postbacks via GET. Each sale is associated with a campaign and a contact cell number. Sales can include a value and a date; duplicates (same cell, campaign, and date) are rejected. Sales data feeds into Dripcel's financial reporting and dashboard.

### Tags

View, retrieve, and delete tags used for contact segmentation. Tags can be assigned to contacts and campaigns. Deleting a tag removes it from all associated contacts and campaigns.

### Compliance Checking

Verify whether a list of cell numbers is compliant with a campaign's targeting criteria before sending. This is a paid endpoint that checks contacts against campaign rules and global opt-outs, returning a per-number `can_send` status.

### Exchange Transactions

Manage transactions on the Dripcel campaign exchange as a buyer. You can accept or reject pending transactions and search transactions by ID, status (`pending`, `completed`, `rejected`), offer ID, or creation date.

### Credit Balance

Check your organisation's current credit balance.

## Events

Dripcel supports **hooks**, which are actions triggered when a contact replies to a send from a campaign. Hooks can be configured per campaign and support webhook-style outbound HTTP notifications. Webhook templates can include dynamic data such as `{{send._id}}` and `{{campaign._id}}`.

There are currently two hook types available:

- **Webhook Hooks**: Trigger an outbound HTTP request to a specified URL when a reply is received on a campaign. The webhook payload can be customized using templates with dynamic fields from the reply and campaign context.

Detailed documentation on hook configuration is limited in the public API docs. Hooks are configured at the campaign level within the Dripcel application rather than through a dedicated API endpoint.
