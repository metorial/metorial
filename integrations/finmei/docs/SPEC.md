Now let me check the Finmei features page and see if there's more detail about webhooks.Now I have a good understanding of Finmei. Let me also check if there's webhook support mentioned anywhere specific.Based on the review finding that mentions webhooks support, and the Postman API documentation, I now have enough information to write the specification.

# Slates Specification for Finmei

## Overview

Finmei is an invoicing and expense management platform for freelancers and small businesses. It simplifies billing, invoice management, and expense tracking. It supports over 180 currencies and offers customizable invoice templates with branding options.

## Authentication

Finmei uses API key (Bearer token) authentication.

To get your authorization token, go to https://app.finmei.com, login and select Settings → Integrations. On this page you can generate your API tokens.

The token will be shown only once. Each API token is assigned to a specific business and can't be used to retrieve information about other businesses in the same account.

The token is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer {api_token}
```

The API base URL is `https://app.finmei.com/api`.

## Features

### Invoice Management

Create, list, and delete invoices. Finmei supports templates, visual customization, support for multiple currencies, and flexible sharing options. Invoices can be shared via unique URLs or email. Recurring invoices can be configured to automatically bill on a regular schedule.

### Customer Management

Delete a specific customer by their ID, list customers with optional filters and pagination, and update existing customer details. Everything you need to know about your customers is available in one dashboard.

### Product Catalog

Manage a product catalog by retrieving, creating, updating, and deleting products. Products can be referenced when creating invoices.

### Payment Tracking

Record, list, retrieve, and delete payments associated with invoices. Keep an eye on both paid and unpaid invoices.

### Expense Management

Finmei makes it easy to record and store all your expenses on one platform. Enter key details about each expense, like the date, price, and seller's name. You can upload a PDF or image of your receipt with all the details.

### Currency Support

List all currencies supported by Finmei. The platform supports over 180 currencies.

### Profile

Retrieve the authenticated user's profile information via the `/api/profile` endpoint.

## Events

Finmei integrates API access, Webhooks and Zapier, indicating webhook support is available. However, detailed documentation on specific webhook event types, configuration, and payload formats is not publicly documented in the available API reference. Based on the nature of the platform, webhooks likely cover invoice and payment lifecycle events, but the exact event categories and configuration options cannot be confirmed from available documentation.
