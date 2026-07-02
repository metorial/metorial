# Slates Specification for Mails.so

## Overview

Mails.so is an email verification and validation service. It allows users to validate individual email addresses or bulk-validate lists of emails, checking for deliverability, format validity, domain and MX record status, catch-all policies, disposable addresses, and blocklist presence. Each validation returns a score and classification to help maintain clean email lists.

## Authentication

Mails.so uses API key authentication. Your API key is a unique identifier obtained upon registration that authenticates your requests. Include your API key in the `x-mails-api-key` HTTP header with every request.

**Header format:**

```
x-mails-api-key: YOUR_API_KEY
```

You need to sign up for a Mails account to obtain your API key. Never share your API key publicly or commit it to version control. Use environment variables or secure key management systems to store it, and rotate it periodically.

**Base URL:** `https://api.mails.so/v1`

## Features

### Single Email Validation

Validate an individual email address in real time. Provide an email address and receive a detailed validation response including a deliverability result (`deliverable`, `undeliverable`, `risky`, or `unknown`), a validity score from 0–100, and specific reason codes.

- **Checks performed:** Format validity, domain validity, MX record validity, blocklist status, catch-all detection, generic address detection, free email provider detection.
- **Result reasons include:** `accepted_email`, `invalid_format`, `invalid_domain`, `invalid_smtp`, `rejected_email`, `catch_all`, `disposable`, `no_connect`, `timeout`.

### Bulk Email Validation

Validate multiple email addresses in a single request by submitting a list of emails. The batch validation is an asynchronous process. Use the batch job ID returned in the initial response to query the status and results of the job.

- Submit an array of email addresses in the request body.
- Each email in the result set receives the same detailed validation response as single validation.
- Bulk validation requires a paid subscription.
- Results must be polled using the batch job ID until the job is complete (the `finished_at` field becomes populated).

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism in the Mails.so API. Bulk validation results must be retrieved by polling the batch status endpoint.
