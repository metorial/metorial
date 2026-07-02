Now let me get the webhook event types:# Slates Specification for Passcreator

## Overview

Passcreator is a platform for creating, managing, and distributing digital wallet passes (loyalty cards, coupons, event tickets, boarding passes, membership cards) for Apple Wallet and Google Wallet. It provides a RESTful API to programmatically manage pass templates and individual passes, validate passes via scanning, send passes via email/SMS, and receive real-time webhook notifications.

## Authentication

The API key must be submitted in the HTTP `Authorization` header on every request. It is used to check if the caller is authorized to execute the function.

**Method:** API Key

**How to obtain an API key:**

1. Log in to Passcreator at `https://app.passcreator.com/en/login`.
2. Navigate to **Integrations → API Keys** (or visit `https://app.passcreator.com/customeruser/apikeys`).
3. Click the button to create a new API Key, enter a friendly name, and click **Create**.
4. The key is shown once and cannot be recovered later.

**How to use the API key:**

Pass the API key directly in the `Authorization` HTTP header on every request, without any prefix (no "Bearer" or similar):

```
Authorization: yourApiKeyHere
```

**Base URL:** `https://app.passcreator.com`

**Scoping:** API keys are scoped to the user account's permissions. If a user only has access to certain templates, the API key will only provide access to those templates. It is recommended to create dedicated service users with restricted access for integrations.

## Features

### Pass Template Management

Create, retrieve, update, and delete pass templates that define the layout, styling, and fields for wallet passes. This includes support for iOS 18 Enhanced Event Tickets. Templates define the structure (fields, colors, images, barcodes, localization) that individual passes are based on. Enhanced Event Ticket layouts are only available for NFC-enabled passes and require NFC approval and account-level enablement.

### Pass Management

Create, read, update, and delete wallet passes. Passes are created from templates and can be personalized with custom field data (e.g., names, IDs, balances). Key capabilities include:

- **Personalization:** Set custom field values, barcode values, user-provided IDs, expiration dates, location-based notifications, and stored values (e.g., loyalty points or gift card balances).
- **Voiding:** Mark a pass as voided/invalid, which greys out the QR code so the pass can't be used any longer. Useful for event ticket redemption.
- **Moving passes:** Move a pass to another template that is part of the same project.
- **Bulk updates:** Update multiple passes at once using segments or a flexible query language to target specific subsets of passes.
- **Search:** Search for passes by text, with support for partial and fuzzy matching.
- **Statistics:** Get detailed statistics about passes of a template, including timelines showing when and how many passes have been created, updated, deleted, or saved, along with operating system breakdowns. Configurable by time frame (day, week, month, year).

### Pass Distribution

- **Email:** If an email template is selected in the sendout settings, include an email address and Passcreator will automatically send the pass via email.
- **SMS:** If an SMS text is specified in the sendout settings, include a phone number and Passcreator will automatically send the pass via SMS.
- Each pass has a unique download page URL that auto-detects the user's device and provides the appropriate download.

### Pass Bundling

Bundle multiple passes together, allowing distribution of up to 10 wallet passes in a single download.

### Pass Validation (App Scan)

Manage app configurations and scans for validating passes. App configurations can be tied to a specific pass template, or validate all passes regardless of template. Scans can be created programmatically or through the Passcreator Smart Scan companion app. Custom properties can be collected during the scanning process.

### Location-Based Notifications

Attach geographic coordinates to passes with latitude, longitude, optional altitude, and a maximum distance radius. A relevant text can be specified for the push notification shown when the user reaches the location. Supports localized notification text for multilingual passes.

### Query Language

Specify segments using Passcreator's query language to filter passes by field values with operators like `contains`, `equals`, and `greaterThan`. Groups of conditions can be combined with logical OR/AND. Useful for targeted bulk updates and reading subsets of passes.

## Events

Passcreator supports webhooks for real-time event notifications. Subscriptions can be scoped to a specific template or apply account-wide.

### Pass Events

- **`pass_created`** — Triggered when a new pass is created.
- **`pass_updated`** — Triggered when an existing pass is updated.
- **`pass_voided`** — Triggered when a pass is voided (marked as invalid).
- **`pushnotification_registered`** — Triggered when a pass is saved to a user's device.
- **`first_pushnotification_registered`** — Triggered when a pass is saved to any device for the first time.
- **`pushnotification_unregistered`** — Triggered when a pass is removed from a device or push notifications are deactivated.

### Pass Template Events

- **`pass_template_created`** — Triggered when a new template is created.
- **`pass_template_updated`** — Triggered when an existing template is updated.

### App Scan Events

- **`app_scan_created`** — Triggered when a pass is scanned with the companion app.

### Message Events

- **`message_sent`** — Triggered when an email or SMS message is successfully sent or delivered.
- **`message_failed`** — Triggered when an email or SMS message fails to send (bounced, skipped, spam).

Webhook subscriptions support optional payload signing for authenticity verification and optional retry for failed deliveries.
