Let me get more details from the actual Handwrytten API documentation.I notice the documentation at `documentation.handwrite.io` is for **Handwrite.io**, which may be a different product from **Handwrytten**. Let me check the actual Handwrytten API (v2) which uses `api.handwrytten.com`.Let me fetch the Swagger docs to get more detail on the Handwrytten v2 API.Let me fetch the apigene page to get more details on the API capabilities.Now I have a good understanding of Handwrytten's API. Let me compile the specification based on all gathered information.

# Slates Specification for Handwrytten

## Overview

Handwrytten is a service that automates sending physical handwritten notes and cards using robotic pens. Handwrytten uses custom-designed handwriting robots that hold real pens to write out the notes in the handwriting style of your choice. All notes are sent via First Class postage, with domestic delivery in the US and Canada, and delivery to 190 other countries.

## Authentication

Handwrytten uses **API key** authentication. The API base URL is `https://api.handwrytten.com/v2/` and the API key is passed in the `Authorization` header.

To obtain an API key:

1. Sign in to your Handwrytten account.
2. Navigate to your profile name and choose Integrations.
3. Click the "Add API Key" button and give it a name.
4. Copy the key by clicking the button next to your new API key.

The API key should be included in all requests as an `Authorization` header:

```
Authorization: <your_api_key>
```

A test mode is available on the integrations page, which allows testing plugin features without being charged.

## Features

### Sending Cards and Notes

Send physical handwritten cards and notes to recipients. Sends a card to a new recipient with all information provided inline. Cards can also be scheduled for future delivery. Scheduling a card works the same as sending but with a specified date. Users specify the message, handwriting style, card/stationery design, recipient address, and return address. Gift cards from major brands (e.g., Starbucks, Amazon) can be included in orders. Physical inserts such as business cards or magnets can also be included.

### Basket/Batch Ordering

Orders can be added to a basket for batch processing; use this for each order when sending multiple cards at once, then check out with Send Basket. This supports workflows where multiple cards need to be sent in a single transaction.

### Address Book Management

Create new address book entries in the Handwrytten address book. Update existing entries in the address book. Find contacts in the address book by searching. Recipients can be added with address and birthday information.

### Stationery and Card Selection

Browse available card designs and stationery options. Over 100 designs are available to choose from, or users can design their own. Custom 5x7 cards with full bleed cover can be created using specified images, fonts, and logos. Images can be uploaded to Handwrytten for use in custom card designs.

### Handwriting Styles (Fonts)

Retrieve available handwriting styles to choose from when composing notes. Each style mimics a different handwriting appearance.

### Templates

Create new message templates and update existing templates. Templates allow reusable message content for common outreach scenarios.

### Credit Cards and Billing

Retrieve all credit cards associated with the account for payment management. Retrieve available gift cards that can be included with orders.

### Order Management

Retrieve order details and track order status. Orders progress through statuses such as processing, written, complete, problem, or cancelled. Proof images of the letter front and envelope can be accessed once the order has been completed.

### User/Account Management

Retrieve authenticated user information and manage account settings.

## Events

The provider does not support webhooks or event subscriptions natively. Zapier exposes a trigger that fires when recipient addresses are needed, but this is a Zapier-specific polling mechanism rather than a native Handwrytten webhook. There is no built-in webhook or event subscription system provided by the Handwrytten API.
