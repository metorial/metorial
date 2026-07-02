# Slates Specification for Basin

## Overview

Basin is a no-code form backend service that handles form submissions, spam filtering, file uploads, and integrations without requiring server-side code. It provides unique URL endpoints where HTML forms can send data, which Basin then stores, processes, and forwards to connected tools and services.

## Authentication

Basin uses API key authentication. All API requests require a token passed either as a query parameter (`api_token`) or via the `Authorization: Bearer` header.

Basin supports 2 types of API keys: Basin API Key, and Form API key.

**Account API Key (Basin API Key):**

- The Basin API key is scoped to the entire account (your user/login). It provides access to all forms in the account.
- Used for managing forms (CRUD), listing domains, and accessing all submissions.
- Found under "My Account" → "Basin API" tab.

**Form API Key:**

- Scoped to a single specific form.
- Used for integrations and accessing submissions for that specific form only.
- Found on the "Integrations" page of each form's dashboard.

Both keys can be regenerated if compromised. The API base URL is `https://usebasin.com/api/v1/`.

Example using query parameter:

```
https://usebasin.com/api/v1/submissions?form_id={form_id}&api_token={form_api_token}
```

Example using Bearer token:

```
curl -X GET "https://usebasin.com/api/v1/submissions" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Features

### Form Management

Create, read, update, and delete form endpoints programmatically. Your form sends user inputs (like name, email, or file uploads) to a unique Basin endpoint, such as https://usebasin.com/f/abc123. Forms can be configured with custom redirect URLs, spam protection settings, and notification preferences. Requires the Account API Key.

### Submission Retrieval

Query and filter your form submission data. Submissions can be filtered by date range (e.g., `created_after`), spam status, and other criteria. Supports exporting data for custom analytics, reporting, or syncing to external databases.

### Domain Management

List your domains. Access domain configuration associated with your account. Requires the Account API Key.

### Project Management

Manage projects and organization of forms within your account via the `/projects` endpoint.

### Spam Protection

Our endpoints utilize multiple layers of protection to screen out 99.9% of spam. Forms support CAPTCHA integrations (hCaptcha, reCAPTCHA, Cloudflare Turnstile), honeypots, duplicate filtering, content blacklists, country blocking, and AI-powered spam detection. Only submissions that are not flagged as spam will trigger a webhook by default. There is a checkbox to enable webhooks for all submissions.

### File Uploads

Store and access up to 10GB of files and images. Forms can accept file attachments as part of submissions. The maximum file upload size is 100MB per file across all plans.

### Email Notifications & Autoresponses

Configure notification emails sent to form owners when submissions arrive, and autoresponse emails sent to submitters. Supports custom email templates with merge tags, custom sender domains, and custom SMTP servers.

### Lead Agent (AI)

Apply tags and score submissions with simple instructions. Filter spam, sort submissions, and trigger integrations based on your tags and scores. Uses natural language instructions rather than complex rules.

### Progressive Form Capture

Automatically save abandoned form data so you never lose a lead. Captures partial submissions from users who don't complete the form.

### Form Analytics

Monitor your form traffic and conversion rates.

### Custom Routing

Route form submissions to different destinations based on configurable rules and conditions.

### Submission Tags and Rules

Tag and categorize submissions with automated rules, enabling conditional processing and integration triggers.

## Events

Basin supports outbound webhooks that fire when form submissions are received.

### Form Submission Webhooks

When a submission is received by an endpoint with a configured webhook URL, Basin will queue up a post on your behalf. Webhooks send submission data to any external URL via HTTP POST.

- **Payload formats:** JSON, form-encoded data, and custom templates. Pre-configured formats are available for Customer.IO, MailerLite, and Pardot.
- **Custom templates:** If pre-built payloads do not meet your requirements, you can create a custom webhook using a flexible template builder. This allows seamless integration with any API. Templates support merge tags that are dynamically replaced with submission data.
- **Custom headers:** Authentication headers can be added to webhook requests for target service authentication.
- **Multiple webhooks:** You can add multiple webhooks to a single form. Each webhook will be triggered independently when a submission is received.
- **Spam filtering:** By default, only non-spam submissions trigger webhooks. This can be toggled to include all submissions.
- **Retry behavior:** If the webhook fails, Basin will retry up to 15 times over the course of 24-28 hours with an exponential backoff.
