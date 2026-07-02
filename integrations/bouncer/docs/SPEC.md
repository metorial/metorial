Now I have enough information to write the specification.

# Slates Specification for Bouncer

## Overview

Bouncer (usebouncer.com) is an email verification and validation platform. It provides real-time and batch email verification APIs to check deliverability, detect disposable/toxic addresses, and validate domains. The platform is GDPR-compliant with data centers in the EU.

## Authentication

All calls made to the Bouncer API have to be made using HTTPS.

Bouncer API supports 2 methods of authentication:

1. **API Key in Header**: Pass the API key via the `x-api-key` header:

   ```
   curl https://api.usebouncer.com/v1.1/email/verify?email=john@usebouncer.com -H 'x-api-key: API-KEY'
   ```

2. **Basic Authentication**: Use the API key as the password (with an empty username):
   ```
   curl https://api.usebouncer.com/v1.1/email/verify?email=john@usebouncer.com -u :API-KEY
   ```

To generate your API Key, sign up for a Bouncer account, click on the API section in the left-side menu, and click the "Generate API Key" button.

The base URL for the API is `https://api.usebouncer.com`.

## Features

### Real-Time Email Verification

Verify a single email address synchronously. It checks the syntax and domain of the address and also contacts underlying SMTP servers to check deliverability. The response includes deliverability status (deliverable, undeliverable, risky, unknown), reason, domain information (accept-all, disposable, free), account details (role-based, disabled, full mailbox), DNS records, email provider, a deliverability score, and a toxicity flag. Bouncer will return the best possible results within 10 seconds (maximum 30).

### Batch Email Verification (Asynchronous)

Verify multiple email addresses in a batch asynchronously. Bouncer's distributed infrastructure retries any verification when required. You submit a list of emails (as JSON or CSV), receive a batch ID, then poll for status or use a callback URL to be notified on completion. Results can be downloaded once the batch is complete. Up to 500,000 emails can be submitted for batch verification at a time.

- A `callback` URL parameter can be provided when creating the batch so Bouncer posts to your URL when processing is complete.
- A `skip-header` parameter controls whether to skip the CSV header row.

### Batch Synchronous Email Verification

Each request adds new emails to a batch processing queue and returns the response when the result is known. This is a hybrid approach — you submit multiple emails and get results back synchronously, combining the convenience of real-time with the throughput of batch processing.

### Domain Verification

Verify whether a domain has valid MX records and if it behaves as a "catch-all" domain.

### Toxicity Check

Identify if your email list contains toxic email addresses, e.g., widely circulated or breached ones, or those belonging to complainers or litigators or potential spam traps. This is a batch operation: you create a toxicity list job, check its status, and download the results. Toxicity is represented on a scale of 1-5.

### Credit Balance

Check the available verification credits on your account. This is useful for monitoring usage and ensuring sufficient credits before running verifications.

## Events

The provider does not support webhooks or event subscriptions in the traditional sense. The only callback mechanism available is the **batch verification callback**: when creating a batch email verification request, you can supply a `callback` URL parameter. When using callbacks, Bouncer will POST to your provided URL when batch processing is complete, after which you can download the results. This is limited to batch completion notifications and is not a general-purpose event/webhook system.
