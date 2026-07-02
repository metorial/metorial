Let me get more details on the API endpoints available.Now I have enough information to write the specification.

# Slates Specification for Givebutter

## Overview

Givebutter is a fundraising platform for nonprofits and community organizations that provides donation forms, fundraising campaigns, events with ticketing, auctions, and donor/contact management (CRM). Its REST API allows programmatic access to manage campaigns, contacts, transactions, funds, plans, tickets, and payouts.

## Authentication

Givebutter uses **API Key** authentication, passed as a Bearer token in the `Authorization` header.

To authenticate requests, provide your API Key as the Bearer header: `Authorization: Bearer {{ your_api_key }}`. All API requests must be made over HTTPS.

**Generating an API Key:**

1. In your Givebutter dashboard, click on **Settings**, then the **Developers** tab, and click **API** in the sub-menu. Click **New API key**, give it a name, and click **Create**.
2. Once generated, API keys are only shown once – they are hashed for improved security. Copy and store the key securely.
3. You need to be an admin to access the Integrations/Developers tab.

**Base URL:** `https://api.givebutter.com/v1/`

There are no OAuth flows or scopes. The API key grants full access to the account's data.

## Features

### Campaign Management

Create, retrieve, update, and delete fundraising campaigns (donation forms, fundraising pages, events). You can display donation data, create campaigns programmatically, or connect donation events to marketing automation tools. Campaigns have properties like title, type, goal, status, currency, and URL.

### Contact Management

Create, retrieve, update, archive, and restore donor/supporter contacts. Contacts support customized profiles, comprehensive donor histories, and tailored fields, notes, and tags. Contacts include personal information, email/phone/address details, contribution statistics, custom fields, external IDs, and subscription preferences.

### Transaction Management

Retrieve transactions and create manual transactions. The transactions endpoint returns only transactions made under your account by default. If your account has campaigns of which you are the beneficiary, or campaigns owned by chapter accounts, you'll need to change the scope parameter. Transaction data includes donor details, amounts, fees, payment method, line items, custom fields, and UTM parameters.

### Recurring Plans

Retrieve information about recurring giving plans (monthly, quarterly, annual subscriptions). Plans are tied to donors and campaigns, and the API provides read access to plan details.

### Funds

Create, retrieve, update, and delete funds. Funds allow organizations to categorize and designate donations for specific purposes or programs.

### Tickets

Retrieve ticket information for event-based campaigns. Tickets contain attendee details, pricing, and check-in status.

### Payouts

Retrieve payout records that represent transfers of raised funds to the organization's bank account.

### Campaign Members and Teams

Retrieve and manage peer-to-peer fundraising members and teams within campaigns. Members can receive credit for donations by sharing their custom link, and any donations made will automatically be credited to them. Teams support leaderboard-style fundraising competitions.

## Events

Givebutter supports webhooks that can be configured from the dashboard under **Settings > Developers > Webhooks**. Givebutter supports 9 primary webhook events. Each webhook includes a signing secret for HMAC signature verification. When creating a webhook, you specify a name, destination URL, and which events to subscribe to.

### Campaign Events

- **campaign.created** – Triggered when a campaign is created.
- **campaign.updated** – Triggered when campaign details are updated.

### Transaction Events

- **transaction.succeeded** – Triggered when a transaction is successful. The `transaction.succeeded` and `contact.created` events are not fired during CSV imports and only trigger for real-time transactions. Givebutter does not provide webhooks for transaction refunds or updates.

### Contact Events

- **contact.created** – Triggered when a new contact is created as a result of a new transaction or manual contact creation. Does not fire during CSV imports.

### Ticket Events

- **ticket.created** – Triggered when a supporter purchases a ticket (not when a ticket type is created in the dashboard).

### Plan (Recurring) Events

- **plan.created** – Triggered when a recurring plan is created.
- **plan.updated** – Triggered when a plan is updated.
- **plan.canceled** – Triggered when a plan is canceled.
- **plan.resumed** – Triggered when a plan is resumed.
