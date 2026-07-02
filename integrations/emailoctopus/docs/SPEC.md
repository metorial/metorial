# Slates Specification for EmailOctopus

## Overview

EmailOctopus is an email marketing platform that provides tools for managing contact lists, sending email campaigns, and running automated email sequences. It offers a REST API (v2) at `https://api.emailoctopus.com` for programmatic access to lists, contacts, campaigns, automations, tags, and campaign reporting.

## Authentication

All requests require a valid API key. EmailOctopus uses **Bearer Token authentication** via API keys.

**Generating an API key:**
On the API documentation page, you'll find an option to create an API key. API keys can be generated in your [account settings](https://emailoctopus.com/developer/api-keys). Legacy API keys (created before API v2) are not compatible with v2 and a new key must be generated.

**Using the API key:**

Include the API key in the `Authorization` header as a Bearer token:

```
Authorization: Bearer {your_api_key}
```

There are no OAuth flows, scopes, or additional credentials required. The API key provides full access to the account it belongs to.

## Features

### List Management

Create, retrieve, update, and delete contact lists. Each list is an independent collection of contacts with its own custom fields and tags. Lists include summary counts of contacts by status (pending, subscribed, unsubscribed) and can be configured for double opt-in.

### Contact Management

Manage contacts within lists — create, retrieve, update, and delete individual contacts. Contacts have an email address, a status (subscribed, unsubscribed, pending), custom field values, and tags. Contacts can be filtered by status, tag, and creation/update dates. An upsert operation is available to create a contact if it doesn't exist or update it if it does. Contacts can also be looked up by an MD5 hash of their lowercase email address.

- Supports bulk updating of multiple contacts in a single request.

### Custom Fields

Define custom data fields on a per-list basis to store additional contact information. Supported field types include text, number, date, single choice, and multiple choice. Fields have a tag (identifier), label, and optional fallback value used in campaigns when no value is available.

### Tags

Create, update, and delete tags on a per-list basis. Tags are labels assigned to contacts for segmentation and targeting. Tags can be added to or removed from contacts during create/update operations.

### Campaigns

Retrieve campaign details including status (draft, sending, sent, error), subject, sender information, target lists, and HTML content. The API is read-only for campaigns — campaigns cannot be created or sent via the API.

### Campaign Reporting

Access detailed campaign performance reports including:

- **Summary reports**: sent count, bounces (hard/soft), opens (total/unique), clicks (total/unique), complaints, and unsubscribes.
- **Contact-level reports**: filter by status (bounced, clicked, complained, opened, sent, unsubscribed, not-opened, not-clicked) to see which contacts had each interaction.
- **Link reports**: performance data for individual links within a campaign (total and unique clicks).

### Automations

Trigger automations for specific contacts via the API. The automation must be configured with a "Started via API" trigger type in the EmailOctopus dashboard. A contact can only trigger an automation once unless "Allow contacts to repeat" is enabled.

- The API only supports starting automations, not creating or managing them.

## Events

You can receive a notification of changes to your contacts by setting up a webhook. When a contact is added to your account, updated or deleted, EmailOctopus will send an HTTPS request containing the change.

Webhooks are configured through the EmailOctopus dashboard (Integrations & APIs → Webhooks). When setting up a webhook, you can specify which event types to receive. You can exclude events generated via the API or imports.

Requests to your webhook endpoint contain an `EmailOctopus-Signature` header, which can be used to validate the request was genuinely sent by EmailOctopus. This signature is generated using HMAC-SHA256 algorithm with the request body as the data and a secret value as the key.

### Contact Created

Fires when a new contact is added to a list. Includes the contact's email address, custom fields, tags, and subscription status.

### Contact Updated

Fires when an existing contact's details are modified (e.g., field values, tags, or status changes). Includes the contact's current fields, tags, and status.

### Contact Deleted

Fires when a contact is removed from a list. Includes the contact's fields, tags, and status at the time of deletion.

### Contact Bounced

Fires when an email to a contact bounces. Includes the associated campaign ID.

### Contact Clicked

Fires when a contact clicks a link in a campaign email. Includes the associated campaign ID.

### Contact Complained

Fires when a contact marks an email as spam. Includes the associated campaign ID.

### Contact Opened

Fires when a contact opens a campaign email. Includes the associated campaign ID.

### Contact Unsubscribed

Fires when a contact unsubscribes from a list. Includes the associated campaign ID.

**Limitations:** EmailOctopus supports a maximum of 2 webhook endpoints per team.
