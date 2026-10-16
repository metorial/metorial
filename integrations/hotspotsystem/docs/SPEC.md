# HotspotSystem API Specification

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

The v2 reference explicitly specifies the `sn-apikey` header and the official notes use it in both code examples. The notes also contain an inconsistent Basic Authentication paragraph; this integration follows the explicit v2 security definition and examples. API v1.0 is deprecated.

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


## Pagination And Provider Data

List tools return one page. `limit` is a positive integer and `offset` is a
non-negative integer identifying the starting item. The v2 notes illustrate
`offset=0` followed by `offset=10` for `limit=10`, although the reference calls
it a page number. The returned `linkHeader`, when supplied by the provider,
preserves its exact `self`, `next`, and `prev` links for continuing the query.
The `raw` result retains the complete original response, including metadata
and original numeric field values.

The `full` location format uses `/locations` and its provider `total_count`.
The `options` format uses `/locations/options`, which documents no pagination
parameters and returns the complete options array without metadata. Its
`totalCount` is derived from that complete array's length. Pagination and sort
inputs apply only to the full format.

Voucher limits, simultaneous use, validity, and price, plus transaction IDs,
location IDs, newsletter flags, and payment amounts, are numeric in the v2
models. Existing tool outputs retain their string types by converting actual
values to strings; zero remains `"0"` and negative limits remain negative.
Missing required provider fields fail clearly instead of being replaced with
empty strings or invented values. Optional MAC custom questions and answers
preserve actual empty strings when the provider returns them.

`verify_credentials` is the read-only identity operation backed by `/me`.
It additionally checks `/ping`; `apiReachable` is false if that secondary check
fails or does not return `pong`. No OAuth or token refresh is required.

## Official Documentation And Scope

- [v2 endpoint and response reference](https://www.hotspotsystem.com/apidocs/api/reference/)
- [v2 authentication, dates, pagination, and v1 deprecation notes](https://www.hotspotsystem.com/apidocs/api/notes/)
- [v2 release announcement, August 25, 2016](https://help.hotspotsystem.com/release-of-api-v2-0-webhooks)

The public v2 reference is old and still contains TODO descriptions for
transaction fields. It documents only the read operations exposed here.
The deprecated v1 voucher-generation API is intentionally outside the v2
surface. The reference's Swagger link resolves to a missing resource; no
current machine-readable specification or authenticated provider behavior was
verified during this update.
