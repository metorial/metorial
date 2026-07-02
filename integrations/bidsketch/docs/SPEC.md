Now I have comprehensive information to write the specification.

# Slates Specification for Bidsketch

## Overview

Bidsketch is a proposal management software that enables businesses to create, send, and track professional proposals. It supports electronic signatures, client management, reusable content sections and fees, and proposal templates with customizable designs.

## Authentication

Bidsketch uses HTTP token authentication. Developers need to obtain an API token from a Bidsketch user and pass it in an authorization header.

The token is sent via the `Authorization` header in the following format:

```
Authorization: Token token="your_api_token_here"
```

To obtain an API token, go to Account Settings, then the API & Integration tab, and click on the "unique token" link to copy the token. Only Admin users can manage API tokens.

The base URL for all API requests is `https://bidsketch.com/api/v1`.

Tokens can be found and managed at `[subdomain].bidsketch.com/account/api_tokens`. Multiple tokens can be generated, and individual tokens can be disabled as needed.

## Features

### Client Management

Create, retrieve, update, and delete client records. Client records include contact details such as name, email, phone, website, full mailing address, and private notes. Bidsketch provides a way to keep track of all current and prospective clients with contact information and private notes.

### Proposal Management

Create, retrieve, update, and delete proposals. Proposals can be created from scratch for a specific client or generated from a saved template. Configurable options include:

- Name, description, currency, and proposal date
- Tax rates (primary and secondary), discounts
- Fees title, optional fees configuration, and approval messages
- Visibility toggles for monthly, yearly, project, and grand totals
- Whether to include optional fees in totals

The proposal creation process is separated into Opening, Fees, and Closing sections, and proposals can be created from scratch or through templates.

### Fee Management

Create, retrieve, update, and delete reusable fee items. Fees support multiple types: fixed, hourly, monthly, yearly, or custom (with user-defined units). Each fee can have a name, amount, quantity, category for grouping, and description.

### Sections

The API exposes proposal sections (content blocks) as a resource that can be listed and managed. Sections represent the reusable content building blocks of proposals.

## Events

Bidsketch supports webhooks for the following event categories:

### New Client Created

Triggers when a new client is created. Fires whether the client is created through the API or via the Bidsketch app.

### Proposal Created

Triggers when a proposal is saved for the first time.

### Proposal Sent

Triggers when a proposal is sent to a client.

### Proposal Viewed

Triggers when a proposal is viewed by the client.

### Proposal Accepted or Declined

Triggers when a proposal is either accepted or declined.

Webhooks do not need to be manually configured in Bidsketch; they are automatically registered via the API.
