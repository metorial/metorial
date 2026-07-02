# Slates Specification for Wisepops

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

### Campaign Reporting

Retrieve a list of your Wisepops (campaigns) with display and conversion metrics, including display count, click count, email count, activation status, and creation date.

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
