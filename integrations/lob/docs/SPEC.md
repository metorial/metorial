Now let me get the full list of webhook event types and more details about features:Let me get the full event types list:Now I have comprehensive information to write the specification. Let me compile it:

# Slates Specification for Lob

## Overview

Lob provides APIs for automated direct mail (postcards, letters, self-mailers, checks, snap packs, booklets) and address verification (US and international). It handles printing, mailing, and delivery tracking through a network of commercial printers and USPS, and offers address standardization and validation across 240+ countries.

## Authentication

Lob uses **HTTP Basic Authentication**. The API key is used as the username, and the password is left blank.

- **Base URL:** `https://api.lob.com/v1/`
- **Credentials:** Provide your API key as the Basic Auth username with an empty password. In Base64 encoding, encode `<API_KEY>:` (note the trailing colon).
- **API Key Types:**
  - **Secret keys** — Full access to all API functionality. Must be kept confidential and stored server-side only.
  - **Publishable keys** — Limited to US verifications, international verifications, and US autocomplete requests. Safe to use in client-side code. Always prefixed with `[environment]_pub`.
- **Environments:** Each key type has a test and live variant. Test keys are prefixed with `test_` and live keys with `live_`. Test mode simulates behavior without printing or mailing. Data between environments is completely isolated.
- **Where to find keys:** Dashboard → Settings → API Keys (`https://dashboard.lob.com/settings/api-keys`).

**Example (cURL):**

```
curl https://api.lob.com/v1/addresses \
  -u test_0dc8d51e0acffcb1880e0f19c79b2f5b0cc:
```

## Features

### Address Book Management

Manage a reusable address book for sender and recipient addresses. Addresses are automatically standardized and verified (for US addresses) when used in mail piece creation. Supports both US and international addresses with custom metadata for internal tagging.

### Postcards

Create, send, and track postcards programmatically. Supports multiple sizes (4x6, 6x9, 6x11), HTML or PDF artwork for front and back, merge variables for dynamic personalization, and optional QR codes. Can be scheduled up to 180 days in advance. Only 4x6 postcards can be sent internationally.

### Letters

Print and mail letters with support for color or black-and-white printing, single or double-sided pages, certified/registered mail options, return envelopes with perforation, and custom envelopes. Letters can include insert cards and buckslips. Supports up to 60 pages single-sided for domestic destinations.

### Self-Mailers

Folded mail pieces that do not require an envelope. Available in multiple sizes (6x18 bifold, 11x9 bifold, 12x9 bifold, 17.75x9 trifold). Support inside/outside artwork via HTML or PDF templates with merge variables.

### Checks

Send physical check payments via mail. Requires a verified bank account. Supports custom check bottom artwork, memo lines, attachments, and logo images. Checks are domestic only (US addresses). Bank accounts must be created and verified via micro-deposits before use.

### Snap Packs & Booklets

Additional mail formats. Snap packs are sealed mailers that tear open. Booklets support multiple pages (8 to 32 in increments of 4). Both support templates, merge variables, and scheduling.

### Templates & Template Versions

Save and manage reusable HTML templates for postcards, letters, checks, and self-mailers. Templates support versioning, allowing you to update designs independently of your integration code. Use merge variables (e.g., `{{name}}`) for dynamic content.

### Campaigns (Beta)

Create and manage direct mail campaigns that combine creatives (design templates) with audience uploads (CSV files). Upload recipient lists, map columns to address fields and merge variables, and send campaigns at scale. Supports audience validation, creative previews, and export of processing results.

### US Address Verification

Verify, correct, and standardize US addresses using USPS CASS-certified data. Returns deliverability status, address components, DPV confirmation, and a Lob Confidence Score (0–100). Supports single and bulk verification, as well as autocomplete suggestions for partial addresses. Also includes reverse geocode lookups and ZIP code lookups.

### International Address Verification

Verify international addresses across 240+ countries and territories. Returns deliverability status, standardized components, and coverage level. Supports single and bulk verification.

### Identity Validation

Validates whether a given person's or company's name is associated with a specific US address. Returns a confidence score and level (high, medium, low).

### National Change of Address (NCOALink)

Automatically corrects recipient addresses when individuals or businesses have registered a new address with USPS. Available for certain Print & Mail editions.

### QR Codes & URL Shortener

Embed unique QR codes on mail pieces to track engagement per recipient. The URL shortener generates trackable short links using Lob's domain or custom domains. Analytics show which recipients scanned, when, and from where.

### Informed Delivery Campaigns

Create USPS Informed Delivery campaigns that enhance digital delivery notifications with ride-along images and clickable URLs. Requires a minimum quantity and advance scheduling.

### Scheduling & Cancellation

Schedule mail pieces up to 180 days in advance. Configurable cancellation windows allow canceling mail before it enters production.

### Billing Groups

Label and group mail piece usage for custom billing organization. Attach billing group IDs to letters, checks, postcards, and self-mailers.

## Events

Lob supports webhooks for real-time event notifications. Webhooks are configured in the Lob Dashboard or via API, specifying a URL and the event types to subscribe to. Lob sends HTTP POST requests with the event payload to the specified URL. Webhooks are signed for verification. Webhooks that fail consistently for 5 consecutive days are automatically disabled.

### Postcard Events

Lifecycle and tracking events for postcards: created, rejected, rendered (PDF and thumbnails), deleted/canceled, and USPS tracking events including mailed, in transit, in local area, processed for delivery, delivered, re-routed, returned to sender, international exit, failed, and viewed (QR code/URL scan). Also includes Informed Delivery email events (sent, opened, clicked through).

### Letter Events

Lifecycle and tracking events for letters, including all standard mail tracking events. Additional events for certified letters (mailed, in transit, processed for delivery, delivered, pickup available, re-routed, returned to sender, issue). Also includes return envelope tracking events (created, in transit, in local area, processed for delivery, re-routed, returned to sender) and Informed Delivery email events.

### Self-Mailer Events

Lifecycle and tracking events for self-mailers: created, rejected, rendered, deleted, and full USPS tracking (mailed, in transit, in local area, processed for delivery, delivered, re-routed, returned to sender, international exit, failed, viewed). Also includes Informed Delivery email events.

### Check Events

Lifecycle and tracking events for checks: created, rejected, rendered, deleted, and USPS tracking (mailed, in transit, in local area, processed for delivery, delivered, re-routed, returned to sender, failed). Also includes Informed Delivery email events.

### Address Events

Events for address creation and deletion.

### Bank Account Events

Events for bank account creation, deletion, and verification.
