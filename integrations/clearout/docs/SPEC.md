Now let me get more details on the webhook event types:# Slates Specification for Clearout

## Overview

Clearout is an email validation, email finding, and data enrichment platform. It provides services for verifying email addresses (instant and bulk), discovering email addresses from names and domains, reverse lookups, and real-time form validation. The API operates on a credit-based system where each operation consumes credits.

## Authentication

Clearout uses API token-based authentication. The base URL may vary based on the type of account, so users should check their base URL by logging into the Clearout App and navigating to the Developer tab.

**Creating an API Token:**
Once signed up and logged in, click on the Developer tab available on top-right and then click "Create API Token". All created API Tokens will be listed under this tab. The token can be reset anytime by clicking the 'Reset Token' icon.

**Using the Token:**

The API token is passed via the `Authorization` header in all requests:

```
Authorization: YOUR_API_TOKEN
```

Clearout does not support API requests directly from web browsers or client-side apps. APIs are allowed to be used only on server-side applications.

Each signup comes with 100 free credits for verification.

## Features

### Email Verification

Verify email addresses in real-time to determine deliverability status proactively. Available in both instant (single email) and bulk (file upload) modes.

- **Instant verification**: Verify a single email address synchronously by providing the email address.
- **Bulk verification**: Upload CSV or XLSX files containing email lists. The process occurs in the background and completion can be tracked via a progress status endpoint. Results can be downloaded after completion.
- Checks include mailbox verification, disposable email detection, syntax validation, MX record validation, SMTP verification, catch-all detection, and duplicate removal.
- Each email is categorized as Valid, Invalid, Unknown, or Catch-All, with sub-status codes for more detail.
- Bulk lists can be cancelled, and results can be downloaded or removed.

### Email Finder

Discover pre-verified email addresses using a person's name and company domain, with both instant and bulk support.

- **Instant finder**: Provide a name and domain to find the corresponding email address. Includes a configurable timeout parameter.
- **Bulk finder**: Upload a file with names and domains to discover emails at scale. Results are processed in the background.
- Features include AI-powered search, company-based email discovery, strict domain filtering, look-alike email finding, built-in email verification, and confidence scoring.
- Contact enrichment options include "All" (business, personal, role-based emails and phone numbers) or "Only Business" (business email addresses only).
- The "Strict Domain Check" setting allows only email domains or website URLs as input, rejecting company names.

### Reverse Lookup

Look up a person's information using LinkedIn URLs, email addresses, or domains.

- **LinkedIn lookup**: Provide a LinkedIn profile URL to retrieve associated person information.
- **Email lookup**: Provide an email address to find person details.
- **Domain/Company lookup**: Provide a domain name to retrieve company information.

### Autocomplete (Company to Domain)

A free API that identifies the corresponding website domains for a given company name, along with the corporate logo and a confidence score. Useful for enriching forms that capture company names or for validating user-entered domains.

### Domain Utilities

MX Lookup and Whois Lookup APIs to find MX records and Whois records for a given domain.

- **MX Lookup**: Resolve MX records for a domain to determine mail server configuration.
- **Whois Lookup**: Retrieve domain registration (Whois) information in JSON format.

### Credit Management

The API provides an endpoint to check the remaining credit balance for the authenticated account.

## Events

Clearout Webhooks send real-time notifications for email validation, email finder, and form guard operations. Webhooks deliver data to your application immediately instead of polling the APIs.

Events are organized by service (Email Verification, Email Finder, Form Guard) and can be individually selected when configuring a webhook. You can configure up to 2 webhook endpoints per account. Webhooks are secured via a shared secret token used for HMAC signature validation.

### Email Verification Events

- **Instant verification completed** (`email_verifier.instant.completed`): Triggered when a single email verification finishes. Includes the full verification result (status, safe-to-send flag, disposable/free/role indicators, AI verdict, etc.).
- **Bulk verification completed** (`email_verifier.bulk.completed`): Triggered when a bulk email verification job finishes. Includes the list ID and list name.

### Email Finder Events

- **Instant finder completed** (`email_finder.instant.completed`): Triggered when a single email finder operation finishes. Includes the discovered email addresses, confidence score, and company info.
- **Bulk finder completed** (`email_finder.bulk.completed`): Triggered when a bulk email finder job finishes. Includes the list ID and list name.

### Form Guard Events

- **Email validation completed** (`form_guard.email_validation.completed`): Triggered when a Form Guard email validation completes. Includes the full verification result identical to the email verification response.
