# Slates Specification for Mailboxlayer

## Overview

Mailboxlayer is an email validation and verification API by APILayer. It checks email address syntax, verifies existence via MX records and SMTP, detects disposable and free email providers, identifies role-based addresses, and returns a deliverability quality score.

## Authentication

Mailboxlayer uses **API key authentication** via an `access_key` query parameter.

- After signing up at mailboxlayer.com, each user is assigned a personal API Access Key.
- The key is passed as a query parameter on every request: `https://apilayer.net/api/check?access_key=YOUR_ACCESS_KEY&email=test@example.com`
- HTTPS encryption is available on all plans.
- No OAuth, scopes, or additional credentials are required.

## Features

### Email Validation & Verification

Validates a single email address in real time. The API performs multiple checks and returns a unified result including format validity, MX record lookup, SMTP verification, and a quality score.

- **Parameters:** `email` (required), `smtp` (enabled by default, can be disabled), `catch_all` (disabled by default, set to `1` to enable catch-all detection).
- Catch-all detection adds latency to the response since it performs additional SMTP checks.

### Bulk Email Validation

Validates multiple email addresses in a single request by providing comma-separated addresses.

- Available only on Professional Plus (up to 25 addresses) and Enterprise Plus (up to 100 addresses) plans.
- Returns the same response structure per email as the single-check endpoint.

### Syntax & Typo Detection

Checks email syntax against RFC standards and detects potential typos in the domain part of the address. If a likely misspelling is found, a "did you mean" suggestion is returned.

### Free & Disposable Provider Detection

Identifies whether an email address belongs to a free provider (e.g., Gmail, Yahoo) or a disposable/temporary email service (e.g., Mailinator, Trashmail). The provider database is updated daily.

### Role Address Detection

Detects whether an email address is a role-based address (e.g., support@, postmaster@, info@) that typically points to a function rather than an individual person.

### Quality Score

Returns a numeric score between 0 and 1 reflecting overall email deliverability, based on syntax validity, SMTP verification results, and provider classification (free, disposable, role).

## Events

The provider does not support events.
