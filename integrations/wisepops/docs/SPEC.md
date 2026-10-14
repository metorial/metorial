# Wisepops API Specification

## Overview

Wisepops is an onsite marketing platform that enables marketers to create and manage website popups, sticky bars, embeds, and notification campaigns. The Wisepops API provides capabilities for reporting and email/lead export, as well as webhook management and data privacy operations.

## Authentication

All API requests require authentication using an API key.

Include the following header in your HTTP requests: `Authorization: WISEPOPS-API key="YOUR_API_KEY_HERE"`

The API key is associated with a specific website. If you have multiple websites configured in Wisepops, you'll need to use the correct key for each website.

To get your API key, log into your Wisepops account, click the Profile menu on the top right, then Settings, then Email API.

The base URL for API requests is `https://app.wisepops.com/api2/`.

## Features

### Contact/Lead Export

Retrieve contacts (emails, phone numbers, and custom fields) collected through Wisepops campaigns. You can filter contacts by collection date (`collected_after`) and by specific popup (`wisepop_id`). Each contact record includes the collection timestamp, associated popup ID, IP address, country code, and all collected form fields.

`list_contacts` returns the existing structured contact output. `export_contacts` downloads one API response as a JSON file and preserves the original response fields. Both accept `collectedAfter`, `wisepopId`, and `pageSize` (1-1000, default 100). The API documents no cursor or offset, so a batch is not a guaranteed complete historical export.

The API contact example omits `form_session`, while webhook examples include it. The legacy `list_contacts` schema retains its required `formSession` string for compatibility; if it is absent, the tool returns a clear error directing callers to `export_contacts`. Availability through the contacts endpoint requires provider verification. JSON exports preserve whatever fields the provider actually returns.

### Campaign Reporting

Retrieve a list of your Wisepops (campaigns) with display and conversion metrics, including display count, click count, email count, activation status, and creation date.

Creation timestamps are returned unchanged in the provider's format, such as `2017-02-25 19:10:00`. Use `list_campaigns` to discover campaign IDs for contact filtering and webhook creation.

### Webhook Management

You can manage your hooks through the Wisepops interface, or by using the `/api2/hooks` endpoint. Once a hook is created, the data flows from Wisepops to your target URL every time data is collected in your campaigns. Hooks can be created, listed, and deleted via the API.

### Data Privacy (GDPR/CCPA)

Automatically delete and suppress data about end-users for GDPR and CCPA compliance. At least email or phone must be provided. If both are provided, all records with either the email or the phone are deleted. The phone must be in international format with a leading `+` and no whitespace.

## Events

Wisepops supports webhooks for real-time data delivery when form submissions occur in campaigns.

### Email Submissions

The event type `email` lets you receive data when a sign-up block (email form) is submitted in a campaign. The payload is sent to a configured target URL via HTTP POST.

### Phone Submissions

The event type `phone` triggers when a phone block is submitted in a campaign.

### Survey Submissions

The event type `survey` triggers when a survey block is submitted in a campaign.

For all webhook event types:

- The `event` parameter is required. Allowed values are `email`, `phone`, and `survey`, respectively for sign-up blocks, phone blocks, and survey blocks.
- The `target_url` parameter is required — the URL that will receive collected forms.
- The HTTP header `X-Wisepops-Signature` is included, containing the HMAC hex digest of the payload using your API key as a cryptographic key, letting you verify that Wisepops is the emitter.

## Limits and official documentation

API access is available on Custom plans. The standard limit is 1,500 calls within 30 days; webhook delivery does not consume API calls. The public API documentation does not expose a current-user or website-profile endpoint.

- [Wisepops API documentation](https://support.wisepops.com/en/articles/9897479-wisepops-api-documentation)
- [Webhook documentation](https://support.wisepops.com/en/articles/9897509-webhooks)
