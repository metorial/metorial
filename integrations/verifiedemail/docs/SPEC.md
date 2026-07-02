Let me get more details from the VerifiedEmail API documentation.Now let me get the actual API documentation from VerifiedEmail's developer site.Now I have sufficient information to compile the specification. Let me summarize what I've found about VerifiedEmail (verified.email):

# Slates Specification for Verifiedemail

## Overview

VerifiedEmail is a real-time email verification and bulk email list cleaning service. It was developed as an internal email validation tool and successfully verifies millions of emails per day in real time. It offers single email verification, bulk list cleaning, continuous list maintenance, a website widget with reCAPTCHA, and integrations via API and webhooks.

## Authentication

VerifiedEmail uses **API key** authentication. On the API Keys page, you can create and manage API keys for use with VerifiedEmail's API. You can create as many or as few API keys as needed. You can customize the access allowed for each by explicitly permitting or blocking the key's access to each API function.

To authenticate:

1. Create an account at app.verified.email.
2. Navigate to the API Keys page in the dashboard and click "Create."
3. Give the key a name and configure permissions by selecting which API functions the key is allowed to access (e.g., verification, webhooks, etc.).
4. Copy the value shown in the API Key field of the new card and store it securely. This is the key you will pass when making API requests to VerifiedEmail.

Each API key can have granular permissions. In the Permissions section of the dialog, select the checkbox next to each API function that will be allowed when the request is made using the new API key you are creating. For example, if you need to create an API key that will be used exclusively to create, list, modify, and disable webhooks, you could clear all checkboxes except the Webhooks checkbox.

API keys can also be configured with an auto-refill credits option. Select or clear the Automatically Refill Credits checkbox. When this checkbox is selected, API actions that would cause your balance to drop below ten available credits will automatically trigger the purchase of sufficient credits to complete the action, using your saved payment method.

Disabling an API key is permanent and cannot be undone.

The full API documentation is available at https://developer.verified.email/.

## Features

### Real-Time Single Email Verification

Verify individual email addresses instantly at the point of capture. Embed the Website Widget into your landing page or use the real-time API for custom integrations. VerifiedEmail verifies email addresses instantly at the point of capture. Verification checks include domain type and health, mail server validation, subdomain and misspelled domain detection, role/alias identification (e.g., "sales@", "support@"), deliverability assessment, and a proprietary deliverability score.

### Bulk Email List Cleaning

Upload and clean email lists of any size. VerifiedEmail eliminates undeliverable emails with 99% precision and provides scoring data for questionable emails to help you determine the best sending policies based on your use case. Lists can be uploaded via the dashboard or through the API. Results can be downloaded with filters applied.

### Continuous List Maintenance

VerifiedEmail's Continuous Cleanup monitors and optimizes email list quality on an ongoing basis. It's cheap and automatically handles temporarily unreachable recipients like those with full mailboxes. Lists can be connected to email providers or in-house CRMs for automatic syncing, cleaning, and verification.

### Website Widget

An embeddable verification widget for landing pages and registration forms that verifies emails in real time at the point of entry. Integrated reCAPTCHA ensures you only pay to verify emails from real visitors.

### Third-Party Integrations

VerifiedEmail provides pre-built integrations including Zapier and HubSpot, allowing email verification to be added to existing workflows without custom development.

### Credit Balance Management

The API allows checking available credit balance. Credits operate on a pay-as-you-go model, and API keys can be configured to auto-refill credits when the balance runs low.

## Events

Originally designed as an internal validation system, VerifiedEmail now instantly verifies millions of addresses every day. Through a quick, adaptable API and webhooks, it combines continuous re-verification, bulk list cleaning, and real-time verification.

VerifiedEmail supports webhooks that can be managed (created, listed, modified, and disabled) through the API. Based on the available information:

### Verification Completion Events

Webhooks can be used to receive notifications when asynchronous verification operations complete, such as bulk list verification jobs finishing. This avoids the need to poll for results on long-running list cleaning operations.

- Webhook endpoints can be configured and managed via the API.
- API key permissions can be scoped specifically to webhook management functions.

_Note: The detailed webhook event types and payload formats are documented at https://developer.verified.email/, which was not fully accessible during research. The above is based on publicly available information from the help documentation and services pages._
