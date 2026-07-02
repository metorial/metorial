Let me fetch the actual API documentation page to get more details.Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for MailBluster

## Overview

MailBluster is an email marketing platform that integrates with SMTP providers like Amazon SES, Postmark, Mailgun, and SMTP2GO for sending bulk email campaigns and managing subscribers. The API allows management of four key aspects of the platform: Leads, Fields, Products, and Orders. The Developer API is not designed for sending emails; it allows you to manage your leads, products, and e-commerce activities from outside your MailBluster account.

## Authentication

MailBluster uses **API Key** authentication. Mailbluster uses API keys for authentication.

To generate an API key:

1. Log in to your MailBluster account and open your Dashboard. Click any brand > Settings > API Keys > Create New API Key. Enter a name for the API Key and click Create API Key. Copy the API key to your clipboard.

API keys are scoped to a specific **Brand** within your MailBluster account. Each brand has its own set of API keys.

The API key is passed in the `Authorization` header of each request:

```
Authorization: <your-api-key>
```

The base URL for the API is `https://api.mailbluster.com/api/`.

The API key is a secret — calling the API directly from frontend code will expose it, as CORS restrictions are in place to prevent this. All API calls should be made server-side.

## Features

### Lead Management

The Developer API is intended for collecting leads from the client's website and managing related data. You can create, read, update, and delete leads (subscribers). Each lead is identified by their email address. Lead properties include first name, last name, subscription status, timezone, tags, and custom fields. When creating a lead, you can configure whether to override existing lead info if a lead with that email already exists.

- Only single lead additions, updates, and deletions are supported via the API; bulk lead operations should use the MailBluster main app.
- MailBluster does not allow duplicate leads (emails) within a brand.

### Field Management

You can personalize email campaigns with Fields and Custom Fields. The API allows managing custom fields that can be associated with leads. Custom fields use merge tags as keys and store string values.

- Custom fields in MailBluster are designed for string data types and are not designed for date and time.

### Product Management

You can create, read, update, list, and delete products. Products support full CRUD operations — creating, listing, getting by product ID, updating, and deleting. Products are used in the context of e-commerce tracking and reporting within email campaigns.

### Order Management

You can create, read, update, list, and delete orders. Orders support creating, listing, getting by order ID, and updating by order ID. Orders link to products and campaigns, enabling e-commerce revenue tracking and attribution to specific email campaigns.

- You need to pass a campaign ID at the time of creating an order to attribute the order to a specific campaign.

## Events

The MailBluster Developer API does not provide native webhook or event subscription functionality. There is no mechanism to register webhook URLs or subscribe to events directly through the API.

Note: MailBluster's internal automation system supports triggers like form subscriptions and tag changes, but these are internal to the platform and not exposed as webhook/event subscriptions through the API.
