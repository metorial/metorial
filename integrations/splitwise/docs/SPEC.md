Now let me fetch the full API documentation to get details on all endpoints and features, especially notifications and webhooks.Now I have comprehensive information about the Splitwise API. Let me compile the specification.

# Slates Specification for Splitwise

## Overview

Splitwise is a service for splitting bills and shared expenses among friends and groups. It tracks who owes whom and provides tools for managing shared expenses, settling debts, and organizing costs by groups (e.g., households, trips). The API (v3.0) allows programmatic access to manage users, groups, expenses, friends, comments, and notifications.

## Authentication

Splitwise supports three authentication methods. All require registering an application at [https://secure.splitwise.com](https://secure.splitwise.com) to obtain a **consumer key** and **consumer secret**.

### OAuth 2.0

The recommended approach for production integrations.

1. Redirect the user to the authorization URL: `https://www.splitwise.com/oauth/authorize` with your `client_id` and `redirect_uri`.
2. After the user authorizes, Splitwise redirects back with a `code` query parameter.
3. Exchange the code for an access token by POSTing to `https://www.splitwise.com/oauth/token` with `client_id`, `client_secret`, `grant_type=authorization_code`, `code`, and `redirect_uri`.
4. The resulting access token dict (containing `access_token` and `token_type`) is used to authenticate subsequent requests.

### OAuth 1.0

A legacy authentication flow also supported by the API.

1. Request a request token from `https://secure.splitwise.com/api/v3.0/get_request_token`.
2. Redirect the user to `https://secure.splitwise.com/authorize?oauth_token={token}`.
3. The user authenticates on Splitwise's site, and Splitwise sends your app an access token that provides access to the user's account data.
4. Exchange the verifier for an access token at `https://secure.splitwise.com/api/v3.0/get_access_token`.
5. The OAuth 1.0 token is valid forever, unless explicitly removed by the user or Splitwise.

### API Key (Bearer Token)

For testing purposes only — you can use the API key provided on your project's detail page in Splitwise to make requests on behalf of your own user. Pass it as a `Bearer` token in the `Authorization` header. This method is not suitable for accessing other users' data.

**Base URL**: `https://secure.splitwise.com/api/v3.0/`

**No scopes** are defined — authenticated users have full access to their own data and related resources.

## Features

### User Management

Retrieve the current authenticated user's profile or another user's profile. Update the current user's details including first name, last name, email, password, locale, and default currency.

### Group Management

Create, retrieve, delete, and restore groups. Groups represent collections of users who share expenses (e.g., a household or a trip). Groups have a type (`home`, `trip`, `couple`, `other`), support simplified debts, and track member balances and debts. Users can be added to or removed from groups. Removing a user fails if they have a non-zero balance in the group. Deleting a group destroys all associated expenses.

### Expense Management

Create, retrieve, update, delete, and restore expenses. Expenses can be split equally among a group or split with custom paid/owed shares per user. Key parameters include cost, description, date, currency, category, and group assignment. Expenses support recurring intervals (weekly, fortnightly, monthly, yearly). Users in an expense can be identified by user ID or by email and name (allowing non-Splitwise users to be included). Expenses include repayment information and receipt images.

- When splitting equally, the authenticated user is assumed to be the payer.
- Expenses can be filtered by group, friend, date range, or update time.

### Friend Management

List, add, and remove friends. Friends include balance information showing what is owed between the current user and each friend, broken down by currency and by group. Multiple friends can be added at once. Friendships can only be deleted if there is no outstanding balance.

### Comments

Retrieve, create, and delete comments on expenses. Comments can be user-generated or system-generated (e.g., tracking changes to an expense).

### Notifications

Retrieve recent activity on the user's account. Notifications cover a wide range of events including expenses added/updated/deleted, comments added, group membership changes, friend changes, and debt simplifications. Notifications can be filtered by `updated_after` timestamp.

### Reference Data

Retrieve the list of supported currencies and expense categories. Categories are hierarchical with parent categories and subcategories. When creating expenses, a subcategory must be used.

## Events

The provider does not support events. Splitwise does not offer webhooks or purpose-built event subscription mechanisms. The notifications endpoint (`get_notifications`) is a pull-based API for retrieving recent account activity, not a push-based event system.
