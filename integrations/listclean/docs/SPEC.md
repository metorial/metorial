Now let me fetch the actual API documentation:That didn't yield much. Let me search for the actual API docs page:Let me look at the PHP SDK on GitHub for more endpoint details:Let me fetch the GitHub repo for the PHP SDK to get more details on the API endpoints:Now I have enough information to write the specification. Let me also check for the email finder/lead generation features mentioned in the dashboard:I now have enough information to compile the specification. Here's what I know:

- Listclean is an email verification/validation service
- API base URL: `https://api.listclean.xyz/v1/`
- Authentication: API key via `X-Auth-Token` header
- Key endpoints: verify email, account profile, bulk upload/list management
- The dashboard also shows email finder and SMTP/email sending (via Mail250), but these seem to be separate products
- Webhooks are available for email sending events (delivered, open, click, bounce, etc.)

# Slates Specification for Listclean

## Overview

Listclean is an email verification and list cleaning service that validates email addresses through syntax checks, DNS/MX record validation, SMTP checks, and risk signal analysis. It identifies Valid, Invalid, Catch-all, Disposable, Role-based, and other risky email types. It supports both single real-time verification via API and bulk verification via file uploads (CSV/TXT).

## Authentication

Listclean uses API key-based authentication. Listclean uses API keys for authentication. When you connect your Listclean account, you can securely store the keys. Sign in and generate your API Token in the API Tokens section of your account settings.

The API key must be passed in the `X-Auth-Token` HTTP header with every request.

- **Base URL:** `https://api.listclean.xyz/v1/`
- **Header:** `X-Auth-Token: <your_api_key>`

You get multiple API keys per account, which allows you to use Listclean for multiple sites. Separate keys can be created for apps, environments, and teammates for easier control and tracking.

Example request:

```
GET https://api.listclean.xyz/v1/account/profile/
X-Auth-Token: your-api-key-here
```

## Features

### Single Email Verification

Verify an individual email address in real time. The endpoint is `https://api.listclean.xyz/v1/verify/email/{email_address}` and accepts a GET request. The response includes the email address, a status (e.g., "clean" or "dirty"), and remarks explaining the result. ListClean checks syntax, MX, SMTP responses, and risk signals to classify each email.

- **Status values:** Emails are classified as clean (valid), dirty (invalid), or unknown (unverifiable).
- ListClean does not charge for "unknown" results. Additionally, duplicate email addresses are not charged.
- Each verification consumes one credit.

### Bulk Email List Verification

Upload CSV or TXT files containing email lists for batch verification. The email column must have the header 'EMAIL', and you may include unlimited columns of other data. After upload, Listclean processes the list asynchronously. After uploading, you wait until the list status changes to COMPLETED. The system runs the list clean process, which might take a few minutes to a few hours depending on data size. Once completed, you can download the results.

- Supported file formats: CSV (.csv) and TXT (.txt).
- Results can be downloaded filtered by type: all, clean (ok), or dirty (bad).
- Removes duplicates so you don't waste credits verifying the same address twice.

### Account Management

Retrieve account profile information and check your remaining credit balance via the API.

- **Profile endpoint:** `GET /v1/account/profile/`
- Credits operate on a pay-as-you-go model. Credits never expire.

### Email Finder

The platform offers an email finder feature that allows generating business email addresses. You can enter a first name, last name, and domain to instantly generate a single email address. You can also copy and paste multiple names and domains, or upload a CSV file containing names and domains to generate emails in bulk.

- Note: It is unclear whether this feature is fully exposed via the API or limited to the dashboard interface.

## Events

Listclean supports webhooks for email-related delivery events (associated with its email sending functionality via Mail250). A Webhook is a way to deliver events like open, click, bounce, etc. over the HTTP Protocol, which helps to integrate with various applications.

### Email Delivery Events

The available webhook event types are: Request, Delivered, Open, Click, Soft Bounce, Hard Bounce, Unsubscribe, Spam, Soft Block, and Hard Block.

- You can select which specific event types you want reported to your system.
- A webhook URL is configured in the Listclean dashboard to receive these event notifications.
- These events are related to the email sending/SMTP functionality (Mail250 integration), not to the email verification process itself.
