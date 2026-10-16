# Laposta API Specification

## Overview

Laposta is a Netherlands-based email marketing platform designed for creating, sending, and tracking newsletter campaigns. Its API is primarily used to synchronize subscriber data with other applications, such as CMS or CRM systems. It was launched in 2011 and is focused on privacy and user-friendliness.

## Authentication

Laposta uses **API Key** authentication via **HTTP Basic Authentication**.

- The API key is used as the username; no password is required.
- Each account has its own API key(s), which can be found in the account under Connect → API Keys.
- If no key exists, a new one can be created. Immediately after creation, the key is displayed only once and should be copied for use.

**Base URL:** `https://api.laposta.nl/`
**Protocol:** HTTPS only

**Example:**

```
curl https://api.laposta.nl/v2/list \
  -u YOUR_API_KEY:
```

The colon after the API key indicates an empty password field, which prevents password prompts. Free accounts are limited to three API keys.

## Features

### List Management

Create, retrieve, update, and delete mailing lists. Each list tracks subscriber counts by status (active, unsubscribed, cleaned). Lists can be configured with notification email addresses for subscribe/unsubscribe events and can be locked to prevent modification through the UI.

- Lists can be purged to remove all active subscribers without deleting the list itself.

### Subscriber (Member) Management

Manage subscribers within lists — add, retrieve, update, and delete individual subscribers. Each subscriber has an email, status (active, unsubscribed, unconfirmed, cleaned), custom fields, signup IP, and source URL.

- Supports **upsert** mode to update existing subscribers or create new ones in a single call.
- Double opt-in lists will send confirmation emails by default; this can be overridden with `ignore_doubleoptin`.
- Supports suppressing reactivation of unsubscribed contacts and suppressing email notifications on API-driven signups.
- **Bulk synchronization** allows adding, updating, or unsubscribing up to 500,000 subscribers in a single request (paid accounts only). The `unsubscribe_excluded` action will unsubscribe all members not present in the request — use with care.

### Custom Fields

Define and manage custom fields on lists. Fields support multiple data types: text, numeric, date, single-select (radio or dropdown), and multi-select.

- Fields can be set as required, included in subscription forms, or shown in list overviews.
- Select field options can be granularly managed by ID (add, rename, or remove individual options).
- Changing a field's data type deletes all existing data for that field.

### Segments

Create and manage segments within lists based on custom field conditions. Segments are defined using a Laposta expression that references field values.

- Segment definitions are best composed in the Laposta UI first, then retrieved and reused via the API.

### Campaign Management

Create, fill, schedule, send, test, and delete email campaigns. Campaigns can target multiple lists and segments.

- Campaign content can be provided as raw HTML or imported from a URL.
- Optional CSS inlining is available on import.
- Campaigns can be sent immediately or scheduled for a specific date and time.
- Re-sending a campaign only delivers to subscribers added since the last send.
- Test emails can be sent to a specific address before dispatching.
- Google Analytics and Mtrack tracking can be enabled per campaign.
- The sender email must be a pre-approved sender address in the account.

### Campaign Reports

Retrieve performance statistics for sent campaigns, including sent/accepted counts, bounces, spam complaints, unsubscribes, unique opens, unique clicks, and web version views, along with acceptance, open, and click ratios.

## Events

Laposta supports **webhooks** for subscriber-related events. Webhooks are configured per list and fire when subscriber data changes within Laposta (e.g., via forms or the UI). By default, changes made through the API do not trigger webhooks, but this can be enabled by contacting Laposta.

### Subscriber Subscribed

Fires when a subscriber is added to a list. Includes additional context: whether it was a new subscription (`subscribed`) or a resubscription (`resubscribed`).

### Subscriber Modified

Fires when a subscriber's data is changed (e.g., email address or custom field updates).

### Subscriber Deactivated

Fires when a subscriber is removed from a list. Includes additional context indicating the reason: `unsubscribed` (opt-out), `deleted` (manually removed), or `hardbounce` (removed after hard bounce).

**Webhook details:**

- Each webhook targets a single event type and a single URL.
- Webhooks are managed via the API or the Laposta dashboard.
- Events are bundled and dispatched approximately every 5 seconds, with up to 1,000 events per request.
- Each webhook has a unique secret. Requests include an `X-Laposta-Signature` header containing an HMAC-SHA256 signature of the body for verification.
- Failed deliveries are retried up to 7 times with increasing intervals. If all retries fail, the webhook is automatically deleted.


## Retrieval and compatibility

Subscriber listing supports optional cursor pagination (1–1000 records), text search, one label filter, and sorting. Omit both `limit` and `cursor` for the complete list. Subscriber and campaign history use opaque cursors and respect account privacy settings. Imported campaign HTML and plaintext can be retrieved; drag-and-drop campaigns do not support content retrieval.

Subscriber writes accept native string, number, and string-array values through `customFieldValues`, keyed by the field `custom_name` returned by `get_fields`. Values there override matching legacy `customFields` entries. On reads, `customFields` contains the string-valued projection; `customFieldValues` and `raw` preserve all actual values. Field option labels are keyed by their provider IDs from `options_full`. Campaign `listIds` lists target list IDs while `listSegments` preserves the provider list-to-segment mapping. Nullable timestamps are omitted from eligible string projections and remain unchanged in `raw`; absent campaign state or Mtrack statistics are not invented.

Authentication uses API-key Basic authentication with no token refresh. The API documents no current-account/profile endpoint. Mtrack inputs are retained for compatibility, but the current official campaign API reference documents only Google Analytics; Mtrack support remains unverified.

Official reference: https://api.laposta.nl/doc/index.nl.php
