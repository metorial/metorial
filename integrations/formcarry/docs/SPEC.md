# Formcarry Integration Specification

## Overview

Formcarry is a form backend (or form endpoint) that allows you to collect form submissions from your HTML or Javascript form with as minimum configuration as possible. It provides features like email notifications, file uploads, spam protection, and integrations with other apps.

## Authentication

Formcarry uses **API Key** authentication.

Every team has an API key that can be found under the Integrations section of the dashboard. Copy this key first, as you will use it for authorization in all requests.

Pass your `api_key` in the request header for every request made to the API.

- **Header name:** `api_key`
- **Header value:** Your team's API key
- **Auth verification endpoint:** `https://formcarry.com/api/auth`

Example:

```
curl -H "api_key: YOUR_API_KEY" https://formcarry.com/api/auth
```

A successful authentication response returns:

```json
{
  "status": "success",
  "message": "You are successfully authenticated, please pass your api_key in every requests header."
}
```

## Features

### Form Management

Create and delete forms via the documented management API. Creation accepts notification emails, redirects, reCAPTCHA settings, a webhook URL, retention settings, and thank-you page options. The returned endpoint URL includes the form ID for later operations. The published API documentation does not specify list or update routes.

### Submission Collection

The `submit_form` tool posts named text fields as JSON to `https://formcarry.com/s/{formId}` and requests a JSON response. It uses the public form endpoint without sending the team API key. Form validation, spam protection, and configured notifications apply. This tool does not upload files.

### Submission Retrieval

Retrieve form submissions programmatically with support for filtering, sorting, and pagination. Available filters include:

- **Date range:** Filter by number of days (e.g., last 7 days).
- **Attachments:** Filter submissions with or without file attachments.
- **Spam status:** Filter spam vs. non-spam submissions.
- **Custom field filters:** Filter by specific field values using contains/not-contains operators.

Submissions can be sorted by any field in ascending or descending order.

### Email Notifications and Auto-Responses

Formcarry provides a unique URL that allows you to receive emails from your form, send auto-responses, upload files, and trigger Zapier zaps. You can configure custom email templates and use custom SMTP email servers for sending notifications.

### Spam Protection

Formcarry has advanced in-built systems to block spam submissions. It also supports Google ReCaptcha integration for additional protection. You can whitelist specific domains that are allowed to submit data to your form endpoint.

### Stripe Payments

Formcarry supports collecting payments through Stripe integration directly from form submissions.

### Field Validations

You can define validation rules for form fields to ensure data quality before submissions are accepted.

### Team Collaboration

Formcarry supports inviting clients or team members to your form, then using formcarry together. You can join multiple teams with your account and have control over different projects.

### Data Export

You can download all the submissions in CSV format directly from the dashboard, facilitating analysis in Excel, sharing with stakeholders, or importing into CRMs. JSON export is also supported.

### Third-Party Integrations

Formcarry integrates form submissions with more than 1500+ apps such as Google Sheets, Notion, or Slack. Zapier integration is natively supported for connecting to additional services.

## Events

Formcarry supports **webhooks** that fire when form submissions are received.

### New Submission

Webhooks allow you to push form data in real-time to external services for advanced automation or analytics. When a new submission is created on any configured form, the submission data is sent to the specified webhook URL.

- You can configure webhook rules to only trigger when certain conditions are met, like when a particular field carries a particular value. This enables more intelligent and conditional integrations.
- The webhook payload includes the submission fields and metadata.
