Now let me get the authentication details and the full list of scopes:# Slates Specification for Brex

## Overview

Brex is a unified spend platform offering global corporate cards, expense management, reimbursements, travel, and bill pay. Its API allows powering internal tools and creating custom workflows across accounting, budgets, expenses, payments, team management, and transactions.

## Authentication

Brex supports two authentication methods:

### 1. User Tokens (API Keys)

The user token is used to authenticate your own Brex account. Only account or card admins can create API tokens in the dashboard. You can restrict scopes to only allow the functionality you need to access via API.

To generate a token:

- Navigate to the Developer page in your Brex account, click on Create Token, name your token, select your permission scopes, and create the token and copy the value.
- Brex obfuscates the token after creation for security reasons, so copy it immediately.
- User tokens expire if they are not used to make an API call for 30 days. When used regularly, they will not expire.

Tokens are sent as Bearer tokens in the `Authorization` header: `Authorization: Bearer {your_token}`.

### 2. OAuth 2.0 (Partner Authentication)

The OAuth token is used when building partner applications to authenticate other Brex accounts. Partners using the onboarding API authenticate with a Client Credentials Grant — there is no user associated with this API access. For other APIs, partners use the Authorization Code grant to obtain tokens on behalf of Brex customers.

OAuth endpoints (production):

- Authorization: `https://accounts-api.brex.com/oauth2/default/v1/authorize`
- Token: `https://accounts-api.brex.com/oauth2/default/v1/token`
- OpenID Connect Discovery: `https://accounts.brex.com/.well-known/openid-configuration`

### Scopes

Scopes define which endpoints your app has access to. You will specify your scopes when generating your user token. Available scopes include:

- `openid`, `offline_access` — required for OAuth and webhook registration
- `users`, `users.readonly` — user management
- `cards`, `cards.readonly` — card management
- `locations`, `departments` — organizational structure
- `vendors` — vendor management
- `transfers` — payment transfers
- `transactions.card.readonly`, `transactions.cash.readonly` — transaction data
- `accounts.cash.readonly` — cash account data
- `budgets` — budget management
- `expenses.card`, `expenses.card.readonly` — expense data
- `https://onboarding.brexapis.com/referrals` — referral/onboarding

As a general security practice, you should request the minimum set of scopes required. For instance, if you are building a simple app that lists all of a company's cards, you should request the cards.readonly scope.

## Features

### Team Management

Manage users, departments, locations, and create virtual cards. Invite and terminate employees, update user profiles, and manage monthly spend limits per user. Invite new Brex users or terminate them to keep Brex in sync with your HR system. Also manage departments, locations, titles, and legal entities.

### Card Management

Dynamically create virtual cards with spend limits for new employees or vendors. Change spend limits per card instantly. Lock any number of Brex employee or vendor cards. Cards can also be unlocked and terminated. Physical cards can be created with mailing addresses for shipping. Each user can only have up to 10 active physical cards.

### Expenses

View expense categories, capture, and report on spend. Access expense information, such as spend categories, memos, and receipts. Supports receipt matching and receipt uploads.

### Payments

Initiate ACH, check, and wire payments and manage vendors from your Brex business accounts. Automatically create new vendors in Brex based on your records in other systems. Receiving payments, such as initiating an ACH debit to an external account, is not supported through the API.

### Budgets and Spend Limits

Dynamically create spend limits with the ability to set limits, assign who can spend from it, and more. Instantly change spend limits, budget members, and more. Manage budgets and budget programs.

### Transactions

Surface real-time financial data where you make business-critical decisions. Only settled transactions are returned from the API. Pending transactions are not returned, so transactions appear only as they settle. View card transactions, cash transactions, accounts, and statements.

### Accounting

Brex offers an AI-native Accounting API aimed at automating accounting workflows and enabling real-time connectivity with ERP platforms. The API supports continuous, two-way data exchange between Brex and ERPs, instead of relying on traditional, one-way bank feeds.

### Onboarding and Referrals

Refer customers and personal contacts to Brex, prefill signup information, and create personalized referral links. Upload documents for onboarding applications.

### Travel

View trips made in Brex Travel.

### Custom Fields

Manage your Brex fields and field values to customize data capture and categorization across the platform.

## Events

Brex APIs offer webhooks to notify you in real-time when certain events happen in your account. Currently only one webhook endpoint can be registered per customer / client_id. However, each endpoint can be registered to listen to multiple event_types.

Webhooks are registered via the Webhooks API by providing a URL and the desired event types. Brex uses HMAC with SHA-256 to sign its webhooks for verification.

The following webhook event types are available:

### Expense Payment Events

- **EXPENSE_PAYMENT_UPDATED**: Fires when a card expense payment status changes (e.g., a purchase is made on a Brex card). Includes expense ID, payment status, payment type, amount, and merchant description.

### Transfer Events

- **TRANSFER_PROCESSED**: Fires when an outgoing payment (ACH, wire, or check) is successfully processed.
- **TRANSFER_FAILED**: Fires when an outgoing payment fails.

### Referral Events

- **REFERRAL_CREATED**: Fires when a new referral is created.
- **REFERRAL_ACTIVATED**: Fires when a referred account is activated.
- **REFERRAL_APPLICATION_STATUS_CHANGED**: Fires when the application status of a referral changes.

### User Events

- **USER_UPDATED**: Fires when a user record is updated (e.g., an invited user accepts and their status changes).

### Accounting Events

- **ACCOUNTING_RECORD_READY_FOR_EXPORT**: Fires when an accounting record is ready to be exported to an ERP system.
