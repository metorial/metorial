Now let me get more details on the webhook event types available:Now I have enough information to write the specification.

# Slates Specification for Piggy

## Overview

Piggy (now also known as Leat) is a loyalty and rewards platform that enables businesses to manage customer loyalty programs, gift cards, promotions, vouchers, and CRM contacts. The Piggy API provides a suite of loyalty and reward services allowing businesses to manage customer loyalty programs, offer discounts, and track customer engagement. The API base URL is `https://api.piggy.eu`.

## Authentication

Piggy supports two authentication methods depending on the integration type:

### OAuth API (Server-to-Server / Client Credentials)

Used for server-side integrations with full account-level access. The Client ID and Client Secret from the Client can be used to initiate the OAuth handshake between Piggy and your integration.

To request an access token, perform a call to `https://api.piggy.eu/oauth/token` with the following payload:

```json
{
  "grant_type": "client_credentials",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

OAuth 2.0 access tokens are provided as a bearer token in the Authorization HTTP header. Your application needs to manage access token expiration. Access tokens expire after a certain time, and the authorization server does not support refresh requests, so your application needs to obtain a new access token before or after expiration.

### Register API (Per-Register Authorization)

Used for POS system integrations. The main difference between the OAuth API and the Register API is that authorization is done on a per-register basis, meaning each access token is linked to a specific Register and thus Shop. This uses an API key passed as a Bearer token in the Authorization header.

For both methods, requests include the header:

```
Authorization: Bearer {access_token_or_api_key}
```

## Features

### Contact Management (CRM)

Manage end-user contacts in the loyalty system. Contacts are provided with basic attributes such as an email address, first name, last name, and so forth. Any custom attributes can also be created, either in the Business Dashboard or via API. Email address is the standard unique identifier, and Contact Identifiers can also be used to find a Contact. Supports creating, updating, listing, and looking up contacts. Contacts can also be verified via email verification flow. Supports contact subscriptions, referrals, and tier management.

### Custom Attributes

Piggy provides a number of standard Contact Attributes, such as first and last name, birthdate, email address and phone number. Any number of custom contact attributes that are relevant for your business can be created as well. Supported data types include: url, text, date, phone, float, color, email, number, select, boolean, rich_text, date_time, long_text, date_range, time_range, identifier, birth_date, file_upload, media_upload, multi_select, and license_plate. Attributes can be organized into groups.

### Loyalty & Credits

Contacts can earn points (Credits) and build up a Credit Balance at an Account. Units are the input values for Credit Receptions — an input value goes in, a certain amount of credits comes out. For most Piggy Clients, 'purchase_amount' will be the default value, but it can be virtually anything (calories, kilometers, visits; anything countable). Loyalty Transactions encompass both Credit Receptions and Reward Receptions, representing all changes to a Credit Balance. Transactions can be filtered by contact, shop, and type.

### Loyalty Tokens

A Loyalty Token is a Credit Reception not yet assigned to a specific Contact. The Contact needs to claim the credits reserved by the Loyalty Token through a unique link. Useful for distributing credits via URLs (e.g., in emails or marketing campaigns).

### Rewards

Using the Loyalty & Rewards tools, Clients can create their own Rewards system by creating a list of Rewards for their Contacts. Supports standard rewards (claimed in-store) and digital rewards (unique codes sent via email). Includes collectable rewards and perks. Reward receptions track when contacts claim rewards.

### Promotions & Vouchers

Manage promotions and associated vouchers. Vouchers can be created, updated, listed, and redeemed by contacts. Promotions can be configured and updated.

### Gift Cards & Prepaid

Gift cards consist of a QR-code/hash and a balance, and exist in either digital or physical form. There is no relation between Gift cards and Contacts, as physical gift cards can be reused and are therefore anonymous. For gift cards linked directly to a Contact, the Prepaid Balance tool is available. Gift card programs can be connected to shops. Gift card transactions track balance changes.

### Orders & Products

Manage orders, order returns, products, and product categories. Orders link purchasing activity to contacts for loyalty tracking.

### Bookings & Visits

Track bookings and visits for contacts, useful for service-based businesses.

### Shops

Manage shop locations connected to an account. Piggy Clients connect one or several Shops to their Accounts, which can be both physical shops and web shops. Shops are required for many API operations.

### Forms

Create and manage forms (public or private) with statuses of PUBLISHED, DRAFT, or BIN. Forms can be used to collect information from contacts.

### Automations

Configure automations through the API. Within the Automations tool, you can set up a more delicate webhook system, only firing after some set of filters have passed.

### Portal Sessions

Manage portal sessions for contacts, enabling self-service access to the Contacts Portal.

### Brand Kit & Subscription Types

Configure brand kit settings and manage subscription types for contact communications.

## Events

Piggy supports webhooks for event subscriptions. For a number of events, you can subscribe to Webhooks to receive event data. Most information concerning the event itself is on the Webhook data. For most related entities, you may only receive its UUID, which then requires an API call to retrieve more data if needed.

Webhook subscriptions can be created, listed, updated, and deleted via the API. Each subscription has a status (ACTIVE or INACTIVE) and targets a specific URL. The subscription's event type and secret cannot be altered after creation.

### Contact Events

- **contact_created**: New contact has been created.
- **contact_updated**: Contact has been updated. When subscribing, an array of one or more contact attributes is required, specifying which attribute changes should trigger the webhook.
- **contact_identifier_created**: New contact identifier created for a contact.

### Loyalty Events

- **credit_reception_created**: New credit reception has been created for a contact.

### Financial Events

- **prepaid_transaction_created**: New prepaid transaction has been created for a contact.
- **giftcard_transaction_created**: New giftcard transaction has been created.

### Voucher Events

- **voucher_created**: New voucher has been created.
- **voucher_updated**: Voucher has been updated.
- **voucher_redeemed**: Contact has redeemed a voucher.

### Promotion Events

- **promotion_updated**: Promotion has been updated.

### Reward Events

- **reward_updated**: Reward has been updated.

### Engagement Events

- **form_submission_completed**: Contact has submitted and completed a form.
- **referral_completed**: Contact has completed a referral.
