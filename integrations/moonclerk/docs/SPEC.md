Let me get the full webhook topics list:Now let me check the forms API endpoint:# Slates Specification for Moonclerk

## Overview

MoonClerk is a cloud-based payment processing platform built on top of Stripe that enables businesses to accept recurring and one-time payments through customizable payment forms. It offers a read-only REST-style API for retrieving payment, customer, and form data, along with a native webhook system for real-time event notifications.

## Authentication

MoonClerk uses **API Key** authentication.

- To generate and obtain an API key, visit: `https://app.moonclerk.com/settings/api-key`.
- Once you have the key, pass it in the `Authorization` header as an authorization token.
- The header format is: `Authorization: Token token=[API Key]`
- The API version and the authentication token are both sent in the header. You must also include an `Accept` header specifying the version and format: `Accept: application/vnd.moonclerk+json;version=1`
- All URLs start with `https://api.moonclerk.com/`. SSL only.

Example request:

```
curl -H "Authorization: Token token=YOUR_API_KEY" \
     -H "Accept: application/vnd.moonclerk+json;version=1" \
     https://api.moonclerk.com/forms
```

## Features

### Payment Forms

Retrieve information about your MoonClerk payment forms. You can list all payment forms or retrieve a specific form by ID. Form data includes the form title and configuration details.

### Payments

Access payment transaction data. Payments can be filtered by form ID, date range (`date_from`/`date_to`), customer ID, and status (`successful`, `refunded`, or `failed`). Payment records include amount, currency, payer info, payment source details, custom fields collected at checkout, and associated coupon information.

- The API is **read-only** — you cannot create, update, or delete payments through the API.

### Customers (Plans)

Retrieve customer/subscription data. There is a terminology difference: the MoonClerk web UI uses "Plan" to refer to the combination of a customer, subscription, and plan, while the API uses the `/customers` endpoint for this data.

- Customers can be filtered by form ID, checkout date range, next payment date range, and status (`active`, `canceled`, `expired`, `past_due`, `pending`, or `unpaid`).
- Customer records include name, email, payment source, subscription details, discount/coupon info, custom fields, and a management URL.
- The API is **read-only** — you cannot modify customer or subscription data through the API.

## Events

MoonClerk provides a native webhook system. Once you set up a Webhook Endpoint in the MoonClerk dashboard, MoonClerk will send a POST request to the specified endpoint URL when the specified topic(s) takes place. Webhook endpoints must use HTTPS and can subscribe to one or more of the following topics:

### Payment Created

Notifies when a payment is created in any state (failed, succeeded, etc). Includes Payment data.

### Plan Created

Notifies when a plan is created. Includes Customer data.

### Plan Ended

Notifies when a plan is canceled or when the set number of periods have been exhausted. Includes Customer data.

### Plan Payment Failed

Triggers when a payment related to a plan has failed. Includes Customer data.
