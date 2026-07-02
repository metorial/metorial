Now let me check if Daffy supports OAuth2 as mentioned in the examples article:Now let me check the GitHub examples for OAuth2 details:# Slates Specification for Daffy

## Overview

Daffy is a modern donor-advised fund (DAF) platform that allows users to set money aside for charity, invest it tax-free, and donate to over 1.7 million U.S. nonprofits. By integrating Daffy, developers can make it seamless for their customers to donate cash, stock, or crypto to nearly any U.S. charity and take advantage of the many tax benefits of having a donor-advised fund. The API is hosted at `https://public.daffy.org/v1/`.

## Authentication

Daffy supports two authentication methods:

### API Keys (Primary)

To start working with the Daffy API you'll need an API key. This requires a Daffy account. You can obtain your API key by visiting https://www.daffy.org/settings/api.

The API key is passed via the `X-Api-Key` HTTP header on every request:

```
curl https://public.daffy.org/v1/users/me -H "X-Api-Key: your-api-key"
```

For security reasons your API key will be displayed only the first time, make sure to copy and save it on a safe medium. Keys can be revoked from the settings page.

### OAuth2

Daffy also supports OAuth2, enabling other applications to allow their end-users to seamlessly log in using their Daffy accounts, much like the familiar "Login with Google/Apple" buttons. By authorizing a third-party app to access their Daffy profile and facilitating login through it, users gain the ability to leverage the Public API on behalf of the end user. OAuth2 is referenced in examples and sample applications but detailed OAuth2 configuration (client registration, endpoints, scopes) is not fully documented in the public API docs. For access to private Partner APIs, contact partner@daffy.org.

## Features

### User Profile Management

Retrieve your own profile or look up other Daffy users by username. Profile information includes user name, avatar, fund name, fund summary, associated causes, and family/fund members. You can also check follow relationships between users.

### Fund Balance

Check your fund's current balance, including total amount, pending deposits, portfolio balance, and available balance for donations. Balance information is private and only accessible for your own fund.

### Causes

Retrieve the charitable causes a user cares about (e.g., Education, International, Sports). Each cause has an ID, name, color, and logo. Causes can be retrieved for any user by their user ID.

### Contributions

View the history of contributions made to your fund. Each contribution includes the amount, payment type (bank account, credit card, crypto, stock, check, wire, DAF transfer, etc.), status (pending, success, waiting for funds, failed), currency, and frequency. Contributions are private and only accessible via your own API key.

### Donations

Create, retrieve, and cancel donations to nonprofits from your fund.

- **Create a donation** by specifying an amount (in USD), a nonprofit's EIN, and optional public note or private memo.
- **List your own donations** with full details including amount, status, and associated nonprofit info.
- **View another user's public donations** (limited information only).
- **Cancel a donation** that hasn't been processed yet.
- Donation statuses include: scheduled, waiting_for_funds, approved, rejected, completed, not_completed, and check_mailed.

### Gifts (Daffy Gifts)

Create and manage Daffy Gifts — digital charity gift cards that let recipients choose which charity to donate to.

- **Create a gift** by specifying a recipient name and amount (minimum $18).
- **List all gifts** you've created, with status tracking (new, accepted, denied, claimed).
- **Retrieve a specific gift** by its unique code.
- Each gift generates a shareable URL the recipient can use to claim it.

### Nonprofit Search & Lookup

Search and retrieve information about nonprofits from Daffy's database of 1.7M+ U.S. charities.

- **Look up a nonprofit by EIN** to get details such as name, website, location, logo, and associated causes.
- **Search nonprofits** by text query and/or cause ID.
- Nonprofit data includes geographic coordinates when available.

## Events

The provider does not support events. The Daffy public API does not offer webhooks or any built-in event subscription mechanism.
