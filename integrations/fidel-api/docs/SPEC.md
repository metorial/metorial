# Slates Specification for Fidel API

## Overview

Fidel API is a financial infrastructure platform that provides a secure and reliable API for businesses to link payment cards with mobile and web applications. Through a single API, developers can securely access data from the three major card networks (Visa, Mastercard, American Express) and build applications on top of the payments infrastructure. When a consumer makes a purchase at a participating store with a linked card, Fidel API spots that transaction and sends it to your server in real-time through webhooks.

## Authentication

Fidel API uses **API key authentication**.

Fidel API accounts have test mode and live mode API keys. To change modes just use the appropriate key to get a live or test object.

There are two types of keys:

- **Public keys**: Used with client-side SDKs (Web, iOS, Android) for secure card enrollment. Prefixed with `pk_test_` or `pk_live_`.
- **Secret keys**: Used for server-side API requests. Prefixed with `sk_test_` or `sk_live_`.

You can find your API keys in the account page of your Fidel dashboard. Authenticate your API requests by including your secret test or live API key in the request header. Create an HTTP header named `fidel-key` and set your secret key as the value. Use the public keys on the SDKs and the secret keys to authenticate API requests.

Example header:

```
fidel-key: sk_test_50ea90b6-2a3b-4a56-814d-1bc592ba4d63
```

Base URL: `https://api.fidel.uk/v1/`

**Note on API v2.0 (Transaction Stream):** The v2.0 production instance introduces an OAuth 2.0 client credentials flow, where the client requests a token from the Authentication endpoint with a request containing the `client_id` and `client_secret`.

## Features

### Program Management

A Program is a set of locations that uniquely represent an offline or online store where transactions from linked cards will be monitored. The Program is the parent object of your card-linked structure. Other objects such as Cards, Locations, Webhooks and Transactions will always be linked to a Program. Brands are shared across Programs. They are unique and independent of each other allowing you to have several independent loyalty or rewards schemes inside your account.

### Brand and Location Management

The Brand object is used to aggregate different locations that a brand operates at and has given consent for you to track transactions from. Locations represent physical or online stores associated with a brand, identified by their Merchant IDs (MIDs). Locations must be synced to initiate the onboarding process with Visa, Mastercard and American Express for mapping so that Fidel can track card transactions from each location.

- Locations require address, city, country code, and postcode.
- The API is available in the United States, UK, Ireland, Canada, Sweden and UAE. Japan is currently in beta stage.

### Card Linking

When a cardholder links a card to a Fidel API program, Fidel API verifies the card with the associated card network and creates a token to represent that card. Using this token-based identification, the card network starts sending the transactions made on that card to Fidel API.

- Cards can be enrolled via SDKs (Web, iOS, Android, React Native) or directly via API (requires PCI compliance).
- A single payment card can only be enrolled once within a single program. Visa has a limitation of 5 active enrollments at the same time, meaning a single Visa card can only be enrolled in up to 5 programs simultaneously across Fidel API.
- Metadata can be attached to cards to associate them with your own user identifiers.

### Transaction Monitoring (Select Transactions API)

Select Transactions API allows you to see and act on enriched, accurate data about transactions made at participating stores with linked cards. Transactions include authorization, clearing, and refund events. Transaction data includes amount, currency, merchant information, location details, and card identifiers.

### Transaction Stream API

The Transaction Stream API enables developers to connect to real-time payment card data and build the next generation of corporate expense management platforms and consumer financial management applications. This product streams all transactions on an enrolled card regardless of merchant, unlike Select Transactions which is limited to participating locations.

### Card-Linked Offers

Fidel Offers help you create and manage card-linked offers with various retailers – all in one place. The Fidel Offers API serves as a transaction qualification engine for Fidel Offers. Developers can create Offers via the Fidel Offers API, which allows your application to create and update Offers, link and unlink Locations to the created Offers, activate and deactivate Offers on specific Cards and send the Offers for approval to a Brand.

- Offers can be of type `amount` (fixed cashback) or `discount` (percentage-based).
- Offers have configurable start/end dates, country, and max reward amounts.
- Each transaction can be rewarded only once. If there is more than one Offer for the same Brand in the same Location for which a Transaction qualifies, the platform selects the most valuable offer; if values are equal, the most recent offer is selected.
- An Offers Marketplace allows browsing and adding pre-existing offers from brands.

### Reimbursement

The Reimbursement API allows you to reimburse cash directly onto linked cards, eliminating the need to handle other payment methods. You can find eligible card transactions for reimbursement, select the reimbursement amount and get all cardholder eligible transactions sorted by amount and date. The Offers product can be used to enable automated reimbursements.

## Events

Fidel API uses webhooks to notify your application when relevant events happen in your account across multiple resources, with event types such as `brand.consent`, `card.failed`, `card.linked`, `location.status`, `marketplace.offer.live`, `marketplace.offer.updated`, `program.status`, `transaction.auth.qualified`, `transaction.auth`, `transaction.clearing.qualified`, `transaction.clearing`, `transaction.refund.qualified`, `transaction.refund.match.qualified` and `transaction.refund`.

Webhooks can be created in the dashboard's webhooks page or by using the Webhooks API. You can create up to five webhook URLs for the same event in the same Program.

### Transaction Events

- **`transaction.auth`**: Sent in real time when a customer makes a payment with a linked card.
- **`transaction.clearing`**: Triggered when a transaction is settled, usually 48 to 72 hours after a payment is made.
- **`transaction.refund`**: Triggered when a transaction is refunded. A refunded transaction also triggers a cleared event, with the auth property set to false. The amount on both events is negative.

### Qualified Transaction Events (Offers)

- **`transaction.auth.qualified`**: Triggered when an authorized transaction qualifies for an active offer.
- **`transaction.clearing.qualified`**: Triggered when a cleared transaction qualifies for an active offer.
- **`transaction.refund.qualified`**: Triggered when a refund transaction qualifies against an offer.
- **`transaction.refund.match.qualified`**: Triggered when a refund is matched to an original qualifying transaction.

### Card Events

- **`card.linked`**: Triggered when a card is successfully linked to a program.
- **`card.failed`**: Triggered when a card linking attempt fails.

### Brand Events

- **`brand.consent`**: Triggered when a brand's consent status changes.

### Location Events

- **`location.status`**: Triggered when a location's onboarding status changes with the card networks.

### Program Events

- **`program.status`**: Triggered when a program's status changes.

### Marketplace Offer Events

- **`marketplace.offer.live`**: Triggered when a marketplace offer goes live.
- **`marketplace.offer.updated`**: Triggered when a marketplace offer is updated.

### Webhook Verification

To confirm that incoming requests on your webhook URL are coming from the Fidel API, you can verify webhook signatures. Fidel sends the `x-fidel-signature` and `x-fidel-timestamp` HTTP headers for each request. Fidel API generates a unique secret key for each webhook you register.
