Now let me check what Zapier shows for Proofly's trigger (lead collection webhook):Now let me check the Proofly integrations/webhook page to confirm if they support webhooks natively:Now I have enough information to write the specification. Based on my research:

- Proofly (proofly.io) is a social proof notification platform
- API uses API key authentication via `X-Api-Key` header
- API base URL: `https://proofly.io/api`
- API endpoints: user info, activity logs, campaigns list, campaign details, campaign toggle, notification data
- Proofly supports webhooks for sending lead data to external systems
- Zapier trigger: "new lead collected"
- Pabbly actions: create conversion, find notification, update campaign status

# Slates Specification for Proofly

## Overview

Proofly is a social proof notification platform that allows websites to display real-time customer activity notifications (such as recent purchases, signups, live visitor counts, and reviews) to increase conversions and build trust. It provides an API to manage campaigns and notifications, retrieve lead and conversion data, and automate marketing workflows.

## Authentication

Proofly uses API key authentication. Pass the API key as a header `X-Api-Key` with every request.

- **API Base URL:** `https://proofly.io/api`
- **Header:** `X-Api-Key: <your_api_key>`
- The API key can be found on the Proofly developers page when logged in.
- If authentication fails, the API returns `ok: false` with an error message such as "Authentication failed: give me a X-Api-Key header."

**Example request:**

```
GET https://proofly.io/api/user
Headers:
  X-Api-Key: your_api_key_here
```

## Features

### User Account Information

Retrieve general account information including user name, email, login history, registration date, and impression statistics (both for the current period and total).

### Activity Logs

Access a chronological log of account activities such as successful logins and registrations, including timestamps and IP addresses.

### Campaign Management

- List all campaigns in the account, including campaign ID, name, associated domain, and enabled status.
- Retrieve all notifications within a specific campaign, including notification type (e.g., `LATEST_CONVERSION`), display settings, trigger rules, and performance statistics (impressions, hovers, clicks, leads).
- Toggle a campaign's active/inactive status using the campaign ID.

### Notification Data Retrieval

Retrieve leads, conversions, and collected data from an individual notification, including data type, submitted input (e.g., email), visitor IP, page URL, and geolocation (city, country).

### External Conversions

Add external leads, conversions, or sales to a Proofly notification, allowing data from third-party systems to be reflected in social proof widgets.

## Events

Proofly supports webhooks to send real-time lead data to any external system or receive incoming data to trigger custom workflows.

### Lead Collection

- Triggers when a new lead is collected through a Proofly notification widget (e.g., an email collector form).
- Lead data includes the submitted input, visitor IP, source URL, and geolocation.
