# Slates Specification for Eventzilla

## Overview

Eventzilla is a do-it-yourself event ticketing and marketing platform that helps event organizers to sell tickets online, process credit card payments and promote events across social media channels. The API provides an easy way to integrate and extend Eventzilla for event organizing requirements, with capabilities for creating and processing registrations and checking in attendees.

## Authentication

Eventzilla uses **API Key** authentication via a custom header.

To send a request to the Eventzilla API, you must generate an API key by creating a new application within your account settings section (**Settings > App Management**). You must authenticate your account when using the API by including your API key in the request.

The API key is passed as a request header named `x-api-key`:

```
x-api-key: 565e95b08ad5210001000001bf8fe9787f6f4c674f2fd622844adf23
```

Ensure that your API key is kept secret. You can disable old keys and create new ones under your Eventzilla account.

Eventzilla API is accessible only via secure HTTPS protocol, so all requests must be sent over HTTPS.

The base URL for all API requests is: `https://www.eventzillaapi.net/api/v2/`

There are no OAuth flows, scopes, or additional credentials required. A single API key per application is sufficient.

## Features

### Event Management

Retrieve a list of all events in your Eventzilla account or get details for a specific event. Events include information such as title, description, dates, venue, ticket availability, status (Live/Draft/Unpublished/Completed), categories, and branding assets (logo, background image). You can filter events by status and category. You can also publish or unpublish an event's sale page via the toggle sales feature.

### Ticket Configuration

Retrieve ticket types (categories) for a specific event, including pricing, sale dates, quantity limits, group discounts, partial payment options, unlock codes, and visibility settings. Ticket types include paid, free, partial, add-on, donation, and approval-based tickets.

### Registration & Checkout

Process end-to-end registrations programmatically through a multi-step checkout flow:

- **Prepare checkout**: Retrieve available ticket types, payment options, custom questions, discount/tax settings for an event.
- **Create checkout**: Initiate a checkout with selected ticket types and optional discount codes.
- **Fill order**: Submit buyer details, attendee information, and answers to custom registration questions.
- **Confirm checkout**: Finalize the order with payment status and optional email confirmation to the buyer.

### Order Management

Confirm or cancel existing orders for events. When confirming or cancelling, you can provide comments and optionally suppress confirmation emails.

### Attendee Management

Retrieve attendee details for a specific event or individual attendee, including name, ticket type, barcode, check-in status, custom question responses, and associated transaction details. Supports checking in or reverting check-in for attendees using their unique barcode.

### Transaction Management

Retrieve transaction details for a specific event or look up individual transactions by checkout ID or order reference number. Transaction data includes buyer information, amount, status (Confirmed/Pending/Cancelled/Incomplete), payment type, discount codes, tax, and fees.

### User Management

Retrieve organizer and sub-organizer account details, including contact information, company, address, timezone, social media profiles, and user type.

### Event Categories

Retrieve the list of available event categories (e.g., Business, Music, Conferences, Training) used for organizing and filtering events.

## Events

The provider does not support webhooks or event subscriptions through its API. Eventzilla mentions webhook and HTTP request options on its integrations page, but no webhook registration or subscription endpoints are documented in the public API. Third-party integration platforms like Zapier use polling-based triggers (e.g., new attendee added, new transaction) rather than native webhooks.
