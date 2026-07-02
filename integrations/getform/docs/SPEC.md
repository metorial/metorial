# Slates Specification for Getform

## Overview

Getform (now rebranded as Forminit) is a headless form backend API service that handles form submissions, file uploads, data storage, and notifications. A headless form backend is an API service that processes and stores form submissions without providing any frontend UI. It works with any frontend framework, static site generator, or CMS platform that can make HTTP requests.

## Authentication

Getform supports two authentication approaches depending on the API version:

### Legacy API (api.getform.io)

- **Token-based authentication via query parameter**: All Getform API endpoints accept authentication by passing your token as a GET parameter.
- Format: `https://api.getform.io/v1/forms/{form_id}?token={getform_api_token}`
- You can find your form-specific API token under your "Form Settings" page on your form dashboard. Each token you generate is form specific and you need to use a different token for each form.
- Make sure to keep the API token secret. If you notice that it's been compromised, you can use "Refresh Token" button to regenerate it.

### New API (api.forminit.com)

- **API Key via header**: This endpoint requires an API key. Generate your API key from Account → API Tokens in the Forminit dashboard.
- All requests must include your API key in the `X-API-Key` header.
- Example: `-H 'X-API-Key: fi_your_secret_api_key'`
- Never expose your API key in client-side code or public repositories. API keys should only be used in server-side applications.

### Submission Endpoint

- The `X-API-KEY` header is optional for submissions. It is required for protected forms and enables higher rate limits.

## Features

### Form Submission Collection

Submit form data programmatically via POST requests to a unique form endpoint. Submissions use "Form Blocks" — a structured way to organize submission data. Instead of arbitrary field names, you use predefined block types (like sender, text, email, file) that come with built-in validation and consistent formatting. Submissions can also be sent as standard form-encoded data (multipart/form-data) for simple HTML forms.

### Submission Retrieval and Search

The Get Form Submissions API allows you to retrieve, search, and paginate through all submissions for a specific form. Supports filtering by query string, timezone formatting, and optionally including file URLs in results.

### File Uploads

Accept files up to 25MB per submission. Supports documents, images, audio, video, and archives with automatic type validation. Over 50 MIME types are supported.

### Spam Protection

reCAPTCHA: Protect forms from spam and abuse using Google reCAPTCHA v3. Runs in the background without user interaction, scoring submissions for suspicious activity. Also supports hCaptcha, a privacy-focused alternative to reCAPTCHA that is GDPR-compliant out of the box. Additionally, honeypot fields provide an invisible layer of protection against spam bots.

### Domain Restrictions

Forminit supports authorized domains, which restrict form submissions to only come from domains you explicitly allow. This prevents unauthorized websites from sending data to your form endpoint.

### Workspaces and Collaboration

Organize forms into workspaces for team collaboration. Manage access and permissions across projects.

### Third-Party Integrations

Integrates with Zapier (connecting to 5,000+ apps), Make (formerly Integromat), Slack (incoming webhooks for channel notifications), Discord (webhook notifications), and custom webhooks that forward submissions to any URL.

### Custom Redirects

Redirect users to custom thank-you pages after successful submissions. Supports dynamic URLs with submission data.

## Events

### Form Submission Webhook

Webhook feature allows you to send your submission data to external sources by setting up webhooks to your form. Whenever new submission is posted to your form endpoint, the submission data in JSON format will be posted to the endpoint URL you provided automatically.

- Configure via the Automation page in the form dashboard by specifying a destination URL.
- Getform sends webhook payloads with submission data, form identifiers, and timestamps.
- Supports automatic retries on failures.
- This is the only event type available — webhooks fire exclusively on new form submissions.
