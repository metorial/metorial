# Slates Specification for YNAB

## Overview

YNAB (You Need A Budget) is a personal budgeting application that helps users plan, track, and manage their finances. Its API provides programmatic access to budget data including accounts, transactions, categories, payees, and scheduled transactions. The API is REST-based, uses JSON, and is served over HTTPS at `https://api.ynab.com/v1`.

## Authentication

YNAB supports two authentication methods. Both produce an access token that must be sent as an HTTP Bearer token in the `Authorization` header on every request.

### Personal Access Tokens

Personal Access Tokens are created by an account owner and are intended for individual usage only. They should not be shared. They are a convenient way to obtain an access token without using a full OAuth flow. To obtain one, sign in to YNAB, go to "Account Settings", scroll down to the "Developer Settings" section, and generate a token.

### OAuth2 (Implicit Grant)

For applications that other YNAB users will authorize, YNAB supports an OAuth2 implicit grant flow:

1. Register an OAuth Application in YNAB's Developer Settings to obtain a `client_id` and configure a `redirect_uri`.
2. Send the user to the authorization URL: `https://app.ynab.com/oauth/authorize?client_id=[CLIENT_ID]&redirect_uri=[REDIRECT_URI]&response_type=token`. Upon user approval, the browser is redirected to the redirect URI with the access token sent as a fragment identifier named `access_token`.
3. For example, if the redirect URI is `https://example.com`, the user would be redirected to `https://example.com/#access_token=8bc63e42-...`. This access token can then be used to authenticate through the API.

There are no granular scopes — a token grants full read/write access to the authorizing user's data.

**Note:** Once you have obtained an access token, you must use HTTP Bearer Authentication (RFC 6750). The token should be sent in the `Authorization` request header.

## Features

### Budget/Plan Management

Retrieve a list of all budgets (plans) belonging to the authenticated user, including summary information like name, date range, and currency/date format settings. A full budget export is available that returns all related entities (accounts, categories, payees, transactions, etc.) in a single request. Convenience aliases `"last-used"` and `"default"` can be used in place of a specific budget ID.

### Account Management

List, retrieve, and create financial accounts within a budget. Supported account types include checking, savings, cash, credit card, line of credit, mortgage, auto loan, student loan, and other asset/liability types. Account data includes balances (cleared, uncleared, total) and linked import status.

### Transaction Management

Full CRUD operations on transactions within a budget. Transactions can be created individually or in bulk, updated by ID or `import_id`, and deleted. Transactions support:

- Split transactions via subtransactions.
- Filtering by account, category, payee, month, date, or type (`uncategorized`, `unapproved`).
- An `import_id` field for deduplication when importing transactions programmatically.
- Automatic matching of imported transactions to user-entered ones within ±10 days and the same amount.
- Triggering linked bank account imports (equivalent to clicking "Import" in the app).

Amounts are expressed in milliunits (e.g., $10.00 = 10000).

### Scheduled Transactions

Create, read, update, and delete scheduled (recurring) transactions. Frequencies include daily, weekly, every other week, twice a month, every 4 weeks, monthly, every other month, quarterly, every 4 months, twice a year, yearly, and every other year. Scheduled transaction dates must be in the future and no more than 5 years out.

### Category and Category Group Management

Retrieve, create, and update budget categories and category groups. Categories include budgeted (assigned) amounts, activity, and available balances for each month. The assigned amount for a category in a specific month can be updated directly. Categories support goal configuration (target balance, target by date, monthly funding, spending goals) with detailed goal tracking fields (percentage complete, months to budget, underfunded amount).

### Payee Management

List, retrieve, and update payees. Payees that represent account transfers are linked to their target account. Payee locations (GPS coordinates captured from mobile apps) are also available as read-only data.

### Monthly Budget Data

Retrieve budget month summaries and details including income, total assigned, total activity, "Ready to Assign" amount, and Age of Money. Detailed month views include per-category breakdowns.

### Money Movements

Retrieve money movements (funds moved between categories) and money movement groups. These can be queried for the entire budget or filtered by a specific month.

### Delta Requests

Many endpoints support a `last_knowledge_of_server` parameter that returns only entities that have changed since the last request. This is useful for efficiently syncing data without re-fetching everything.

## Events

The provider does not support events. YNAB does not offer webhooks or any built-in event subscription mechanism through its API. The `last_knowledge_of_server` delta request mechanism can be used to detect changes, but this is a polling-based approach rather than a push-based event system.
