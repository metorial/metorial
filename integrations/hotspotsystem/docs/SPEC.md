# Slates Specification for Hotspotsystem

## Overview

HotspotSystem is a cloud-based Wi-Fi hotspot management platform used by businesses, ISPs, and venues to deploy and manage captive portal hotspots. It handles user authentication, access control, billing for internet usage, and provides a control center for managing multiple hotspot locations. The API provides read access to hotspot data including locations, customers, subscribers, vouchers, and transactions.

## Authentication

HotspotSystem uses API key authentication. The API key must be passed as a custom HTTP header in every request.

- **Method:** API Key
- **Header name:** `sn-apikey`
- **Base URL:** `https://api.hotspotsystem.com/v2.0`
- **How to obtain:** The API key is generated from the HotspotSystem Control Center.

Example request header:

```
sn-apikey: your_api_key_here
```

You can verify your credentials by calling `GET /me`, which returns your user ID and operator name.

Note: API v1.0 used HTTP Basic Auth with the API key as the username, but v2.0 (current) uses the header-based approach described above.

## Features

### Location Management

Retrieve a list of all registered hotspot locations associated with your account. Each location includes an ID and name. Data can also be retrieved in a simplified options format for use in dropdowns or selection interfaces. All data queries (customers, subscribers, vouchers, transactions) can be scoped to a specific location.

### Customer Data Access

Retrieve customer records across all locations or filtered by a specific location. Customer records include contact details (name, email, phone, address), registration date, and social login attributes (social network name, social ID, username, profile link, gender, age range, followers count) when the customer registered via a social network (e.g., Facebook, Instagram).

### Subscriber Management

Retrieve subscribers (customers who opted into the newsletter) across all locations or by specific location. Subscriber records share the same data structure as customers, including social login attributes.

### Voucher Management

Retrieve voucher/access code records across all locations or by specific location. Voucher data includes the voucher code, traffic limits (total, download, upload), simultaneous use allowance, validity period, expiration, price, and currency.

### Transaction Tracking

Retrieve transaction records that represent individual access events on the hotspot. Transactions are categorized into four types:

- **MAC transactions:** Device-based (MAC address) access events, including custom data capture fields (up to 5 question/answer pairs).
- **Voucher transactions:** Access events using voucher codes, including payment amount and currency.
- **Social transactions:** Access events via social network login, including social profile attributes.
- **Paid transactions:** Access events involving direct payment, including payment amount and currency.

All transaction types can be queried globally or scoped to a specific location.

## Events

HotspotSystem supports webhooks that are configured via the Control Center. When creating a webhook, you select a location, an event type, and a callback URL. A unique API key is generated per webhook for signature verification.

Webhook payloads are sent as HTTP POST requests with a JSON body. Each request includes an `HTTP_X_HOTSPOTSYSTEM_HMAC_SHA256` header containing an HMAC-SHA256 signature (base64-encoded) signed with the webhook's API key, which should be used to verify authenticity. Your endpoint must return HTTP 200 to acknowledge receipt; failed deliveries are retried up to 20 times. Webhooks are processed approximately every minute.

### Customer Creation

- **Event:** `customer.create`
- Triggered when a new customer registers at a hotspot location.

### Subscriber Creation

- **Event:** `subscriber.create`
- Triggered when a new client subscribes to the newsletter.

### Paid Transaction Creation

- **Event:** `transaction.paid.create`
- Triggered when a new paid transaction (direct payment for access) is recorded.

### Voucher Transaction Creation

- **Event:** `transaction.voucher.create`
- Triggered when a new voucher-based access transaction is recorded.

### MAC Transaction Creation

- **Event:** `transaction.mac.create`
- Triggered when a new MAC-based (device) access transaction is recorded.

### Social Transaction Creation

- **Event:** `transaction.social.create`
- Triggered when a new social login access transaction is recorded.
