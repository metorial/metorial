Let me fetch the API documentation to get more details on the bulk verification and other features.Now let me fetch the enrichment API page and the OAS YAML for more details:Now I have enough information to compile the specification. Let me also check the OAS 3.0 doc:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Emaillistverify

## Overview

EmailListVerify is an email verification and validation service that checks whether email addresses are valid, deliverable, and safe to send to. It offers single and bulk email verification, email finding by name and domain, domain search, and email enrichment. The service detects invalid addresses, spam traps, disposable emails, catch-all domains, and syntax errors.

## Authentication

The API uses API key-based authentication. You can retrieve your API key by visiting the **API** section of your dashboard.

The API key is passed as a query parameter named `secret` on every request. The base URL for API requests is `https://apps.emaillistverify.com/api`.

**Example:**

```
GET https://apps.emaillistverify.com/api/verifyEmail?secret=YOUR_API_KEY&[email protected]
```

To obtain your API key: navigate to the dashboard after logging in, click the API section in the dashboard menu, and copy the API key displayed on the API section page.

No OAuth or additional scopes are required. An active account with available verification credits is needed to make API calls.

## Features

### Single Email Verification

Allows you to verify email addresses automatically by sending a validation request and receiving a structured result in real time. The API checks syntax, domain validity, MX records, mailbox existence, disposable email detection, spam trap detection, and catch-all domain detection.

- **Parameters:** Email address to verify; optional `timeout` parameter (maximum seconds to attempt verification, defaults to 30).
- Possible response statuses include: `ok` (passed all tests), `fail` (failed one or more tests), `unknown` (cannot be accurately tested), and `incorrect` (syntax error or no email provided).

### Detailed Email Verification (Email Enrichment)

Provides enriched data about an email address beyond simple verification, via the `/api/verifyEmailDetailed` endpoint. Returns structured profile information including:

- Full name, gender
- Email service provider (ESP)
- Whether it is a free or no-reply email address

Useful for CRM enrichment, lead scoring, and contact segmentation.

### Bulk Email Verification

The API provides the ability to check individual email addresses and can accept an email list through file upload. Users upload a CSV or text file of email addresses, receive a file/job ID, then poll for status and download results when processing is complete.

- **Workflow:** Upload file → receive job ID → check status via job ID → download results (verified list and full results).
- The uploaded file could fail if it has incorrect formatting or a broken upload.
- Credits are consumed per email verified; processing fails if the account balance is zero.

### Email Finder

Discovers valid, verified business emails by name and domain. You can query by name + domain or company, and you can also use first name + last name + domain for better accuracy.

- If you only have the domain to search with, you will receive functional emails such as 'contact@' or 'support@'.
- EmailListVerify provides a confidence score for all discovered email addresses.
- Only charges for email addresses returned with medium confidence or higher.

### Domain Search

Finds verified email addresses linked to any domain. Domain search returns only functional email addresses like "contact@" or "support@".

- Each result comes with a confidence score.
- All emails are verified using the core verification technology to filter out bad or outdated addresses.

## Events

The provider does not support events. EmailListVerify does not offer webhooks, event subscriptions, or any built-in push notification mechanism through its API.
