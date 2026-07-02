# Slates Specification for Formsite

## Overview

Formsite is an online form and survey builder that allows users to create web forms for data collection, including order forms with payment processing. It provides a REST API (v2) for programmatic read-only access to form definitions and submission results, along with webhook support for real-time notifications.

## Authentication

Formsite uses **API Key (Access Token)** authentication. The access token acts as an API password and must be included in every API request. It gives access to all forms and results in the account.

**How to obtain the token:**
The access token can be found on the Form Settings → Integrations → Formsite API page. The Formsite API is only available for Pro 1 accounts and above.

**How to use the token:**

Include it as a Bearer token in the HTTP `Authorization` header:

```
Authorization: bearer your_token_value
```

**Required configuration values:**

In addition to the access token, each API request requires:

1. **Server prefix** (`server`): The server your account is hosted on (e.g., `fs1`, `fs18`). This determines the base URL.
2. **User directory** (`user_dir`): Your account's directory identifier, same as used in your form links.
3. **Form directory** (`form_dir`): The specific form's directory identifier (needed for form-specific requests).

The base URL for API calls is: `https://{server}.formsite.com/api/v2/`

All three values (server, user directory, and form directory) can be found on the Formsite API settings page alongside the access token.

## Features

### Form Listing and Details

Retrieve a list of all forms in the account or details for a specific form. Returns form name, description, open/close state, publish link, embed code, file storage size, and results count. Useful for discovering available forms and their status.

### Form Items (Field Definitions)

Retrieve the field/item definitions for a specific form, including item IDs, labels, positions, and parent-child relationships for composite items (e.g., Matrix, Multi Scale). Item data can be used to label results data by matching item IDs from this action to item IDs from the Get Form Results action. Only items that store results are included; decorative items like headings and images are excluded.

- A `results_labels` parameter can be used to apply custom Results Labels.

### Form Results (Submissions)

Retrieve form submission results with rich filtering and search capabilities. The API only lets you retrieve data. You cannot add, edit or delete any data with the API.

Each result includes metadata such as start/finish/update dates, user IP, browser, device type, referrer, result status, and optionally Save & Return login info and payment details.

- **Filtering**: Filter by date range (`after_date`, `before_date`), result ID range (`after_id`, `before_id`), or limit/page for pagination.
- **Sorting**: Sort by any meta field or item ID, ascending or descending.
- **Searching**: Search for results where a specific item equals, contains, begins with, or ends with a given value. Multiple search criteria can be combined with AND/OR logic.
- **Results Views**: Apply a predefined Results View to control which columns are returned.
- A maximum of 500 results is returned per request; use pagination to retrieve more.

### Webhook Management

Create, list, update, and delete webhooks for a specific form via the API. Webhooks can be configured with an optional handshake key for verification. If a webhook endpoint responds with HTTP 410, the webhook is automatically deleted.

## Events

Formsite supports webhooks that can be managed via the API.

### Result Completed

A webhook will post to its URL each time a form result is completed, using the same data format as Get Results. Currently, the only supported event type for webhooks is "result_completed".

- **Handshake key**: An optional shared secret string that is included in the webhook payload for verification purposes.
- The webhook payload contains the full result data (submission answers, metadata) in the same format as the Results API response.
