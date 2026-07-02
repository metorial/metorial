# Slates Specification for Simplero

## Overview

Simplero is an all-in-one platform for information publishers and online course creators, offering email marketing, billing, membership sites, and digital content delivery. Its API provides programmatic access to manage contacts, mailing lists, products, purchases, invoices, and account administrators.

## Authentication

Requests are authenticated using HTTP Basic Auth, with the API key as the username, password left empty.

The API key can be obtained from the Simplero Admin interface under **Settings > Integrations**.

All API request URLs start with `https://simplero.com/api/v1/`. All requests must be over HTTPS.

Additionally, a **User-Agent** header identifying your application must be included in every request, in the format: `Your App Name (email@example.com)`. Failure to include it results in a 400 error.

Example request:

```
curl -u "YOUR_API_KEY:" \
  -H 'User-Agent: My App (myemail@example.com)' \
  https://simplero.com/api/v1/lists.json
```

Note the colon after the API key (empty password).

## Features

### Contact Management

Create, update, and look up contacts by email or internal ID. Contacts support custom fields (address, phone, etc.), tags, notes, GDPR consent tracking, and affiliate attribution. You can also update a contact's login credentials (with their consent) and retrieve course completion progress across all courses for a given contact.

- Tags can be added or removed individually via dedicated endpoints.
- Custom contact fields use an internal naming convention (`field_ID_SUBFIELD`).
- You cannot remove tags with the create/update contact call; use the dedicated remove-tag endpoint instead.

### Mailing List Management

Retrieve all lists, subscribe contacts to lists (individually or in bulk up to 1,000 at a time), unsubscribe contacts, and look up subscriptions by email. Subscriptions support tracking parameters such as IP address, referrer, affiliate ref, landing page ID, and custom tags.

- Bulk subscribe operations are asynchronous; a token is returned to poll for completion status.

### Product and Purchase Management

List all products, retrieve product details, and look up purchases by email, ID, or token. Purchase records include detailed billing information, payment processor details, transaction history, and participant/entrant data.

- Purchases cannot be created on trial accounts.
- A dedicated webhook endpoint (`POST https://simplero.com/webhook/products/{id}/purchase`) allows external selling systems to automatically add people to products in Simplero by providing an API key, name, and email as POST parameters.

### Invoice Retrieval

Retrieve invoices with filtering by creation date range or invoice number range. Results can be sorted in ascending or descending order.

### Administrator Management

List, create, update, and remove account administrators. Administrators can be assigned predefined system roles (Co-Owner, Admin, Basic admin, Assistant, Support specialist, Affiliate manager) or custom roles. You can configure ticket assignment and support visibility settings per admin, and auto-generate credentials with invitation messages for new admins.

## Events

Simplero supports outbound webhooks through its **Triggers** system. Webhooks can be managed under Settings > Integrations, where you can view all webhooks in use and create new ones. Triggers let you take certain actions when something happens — they are if-then rules that trigger actions based on specified events. One of the available trigger actions is posting data to a webhook URL.

The following event categories can be configured to fire webhooks:

### List Subscription Events

- Triggered when someone subscribes to a list.
- Triggered when a customer opts out of a list.

### Purchase Events

- Fired whenever a new purchase is made.
- Fired when a purchase expires, is canceled, or is refunded.
- An abandoned cart trigger fires when a customer abandons a purchase.

### Tag Events

- Triggers when a tag is added to a contact.
- Triggers when a tag is removed from a contact.

### Course and Content Events

- Triggers when a contact completes a course lesson, views a course lesson, or uncompletes a course lesson.

### Membership and Participation Events

- Triggers when a contact joins a membership site or when a participant is activated/deactivated.

### Form and Survey Events

- Triggers when a contact submits a survey or completes a worksheet.
- Triggers when a contact signs up from a sign-up form.

### Event Registration Events

- Triggers when a contact registers for, attends, or joins an event, or when an event is scheduled on a scheduling link.

### Pipeline Events

- Triggers when a pipeline entry is created or when a contact reaches a certain pipeline stage.

### Field Change Events

- Triggers when the value of a contact field changes; you can specify which field to monitor.

### Email Interaction Events

- Triggers when a contact clicks a link in an email.

### Affiliate Events

- Triggers when a contact registers for an affiliate program, is approved, rejected, or retired.
