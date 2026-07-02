# Slates Specification for Sendfox

## Overview

SendFox is an email marketing platform designed for content creators. Its REST API lets you manage contacts, campaigns, lists, automations, and forms programmatically. API access requires a Lifetime or Empire plan; free users cannot use the API.

## Authentication

SendFox supports two authentication methods, both based on OAuth 2.0:

### Personal Access Token

For simple or server-side integrations. Create a personal access token at https://sendfox.com/account/oauth. Once the token is generated it will only be shown once, so be sure to take note of it before closing the window. Include the token as a Bearer token in the `Authorization` header:

```
Authorization: Bearer {TOKEN}
```

### OAuth 2.0 (Authorization Code)

For custom integrations that require users to authenticate in order to get access tokens to make API requests on their behalf, you'll need to create an OAuth 2.0 client. Create OAuth 2.0 clients from the settings page at https://sendfox.com/account/oauth. The flow uses the `authorization_code` grant type.

- **Authorization URL:** `https://sendfox.com/oauth/authorize`
- **Access Token URL:** `https://sendfox.com/oauth/token`
- **Base API URL:** `https://api.sendfox.com`

Credentials required: Client ID and Client Secret (obtained when creating the OAuth app). No specific scopes are documented; a single token grants access to all API features available to the authenticated user.

## Features

### Contact Management

Create, update, delete, and list contacts (subscribers). Contacts can be searched and filtered by email or subscription status. You can view a contact's email activity including open, click, bounce, and unsubscribe history. Batch import allows creating or updating up to 1,000 contacts in a single request. Contacts can be unsubscribed by email address.

- Contacts can be assigned to one or more lists upon creation or update.
- Custom contact fields (text, number, date) can be defined and set per contact.

### List Management

Create, update, delete, and list contact lists. You can view contacts within a specific list, add contacts to a list, and remove contacts from a list. Lists include aggregate engagement metrics (average open and click rates).

- A list cannot be deleted if it is in use by forms, landing pages, or automations.

### Campaign Management

Create, update, delete, and list email campaigns. Campaigns are created as drafts and can be sent immediately or scheduled for a specific time. You can retrieve campaign performance statistics including sent count, open/click/bounce/unsubscribe/spam counts and rates.

- Campaigns require HTML content, a subject line, sender name, and sender email.
- Only draft campaigns (not yet sent) can be updated or deleted.
- Subject lines cannot start with "RE:" or "FWD:".
- At least one list must be assigned to send or schedule a campaign.

### Automation Management

Create, update, delete, and list email automations. Automations consist of a trigger and a sequence of timed emails. You can add, update, reorder, and remove individual emails within an automation.

- Supported trigger types: contact added to a list (`apply_list`), campaign opened (`open_campaign`), or campaign link clicked (`click_campaign`).
- Each automation email has a configurable delay (in hours, 0–5000) before sending.
- Automations can be activated or deactivated.

### Form Management

Create, update, delete, and list subscription forms. Forms are linked to one or more lists that contacts are added to upon submission.

- Optional redirect URL after submission.
- Optional GDPR consent checkbox requirement.
- Free users are limited to one form.

### Sender Domain Management

Add, validate, and delete custom sender domains for email whitelabeling. You can retrieve required DNS records and trigger DNS validation for a domain.

- Requires an active subscription.

### Custom Contact Fields

Define custom fields (text, number, or date types) to store additional data on contacts. Fields can be created, updated (label only), and deleted. Field type is immutable after creation.

### User Information

Retrieve the authenticated user's profile including current contact count and contact limit.

## Events

The provider does not support events. There is no documented webhook system or event subscription mechanism in the official SendFox API. Third-party integration platforms (e.g., Zapier, Make) may offer polling-based triggers, but SendFox does not natively provide webhooks or push-based event notifications.
