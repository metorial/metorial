# FraudLabs Pro API Integration

## Overview

FraudLabs Pro provides an advanced fraud prevention solution that helps protect online businesses from payment fraud (also known as CNP fraud). The system conducts comprehensive fraud validation on all elements, including IP geolocation, email, billing and shipping information, credit cards, anonymous proxies, blacklisted data, transaction velocity, and more. It also offers SMS-based OTP verification for customer identity authentication.

## Authentication

FraudLabs Pro uses API keys for authentication. To get your API key, sign in to your FraudLabs Pro account and go to the Accounts -> Licenses page.

The API key is passed as a `key` parameter in each API request (either as a POST body field or query parameter). For example:

```
POST https://api.fraudlabspro.com/v2/order/screen
  -d "key=YOUR_API_KEY"
  -d "ip=8.8.8.8"
```

You need to register for an API key before using the API. Visit the Micro Plan to sign up for an API key if you do not have one. A free plan is available.

## Features

### Order Fraud Screening

Detects all possible fraud traits based on input parameters supplied. The more input parameters supplied, the higher accuracy of fraud detection. You submit order details (IP address, billing/shipping info, email, credit card number, payment method, order amount, currency, etc.) and receive a fraud risk assessment.

- Every transaction is analyzed against multiple elements such as IP, email, billing address, shipping address, and so on. The system returns a fraud score that indicates the likelihood of fraud, helping businesses decide whether to approve, review, or reject a transaction.
- Key validations include:
  - IP address geolocation & proxy validation — identifies the geographical location and checks whether the IP is associated with proxies, VPNs, or TOR networks.
  - Credit card issuing bank validation — verifies that the credit card's issuing bank information matches the billing details provided by the customer.
  - Transaction velocity validation — tracks how often a particular email, IP, or card is used across multiple transactions within a short time frame.
  - Device transaction validation — detects anomalies in device fingerprints by monitoring browser type, operating system, and device identifiers.
  - Blacklist validation — compares incoming transactions against FraudLabs Pro's global blacklist of known fraudsters or a custom blacklist.
  - Email address validation (free/disposable email detection, domain existence check)
- Supports various payment methods including credit card, PayPal, cash on delivery, bank deposit, gift card, crypto, and wire transfer.

### Order Feedback

Allows updating the status of a transaction to APPROVE, REJECT, or REJECT_BLACKLIST. The FraudLabs Pro algorithm will improve its formula for determining the fraud score using the data collected.

- Available actions: Approve, Reject, and Reject & Blacklist.
- A note can be attached to the feedback for reference.

### Get Order Result

Retrieves an existing transaction from the FraudLabs Pro fraud detection system. This API is only available for paid plans.

- Can look up transactions by FraudLabs Pro transaction ID or your own order ID.

### SMS Verification (OTP)

Sends an SMS with a verification code and a custom message for authentication purposes.

- Configurable parameters include phone number, country code, custom message template (with an `<otp>` placeholder), and OTP timeout duration.
- A separate API call verifies the OTP entered by the user against the one that was sent.
- You need to ensure you have enough SMS credits to send verification SMS.
- A 24-hour cooldown is required if SMS delivery fails 10 times in a day.

### Payment Feedback

Reports the final payment status and gateway message, with an optional screened transaction ID.

## Additional screening data

Order screening accepts an optional shipping method and item details (SKU, quantity, price, name, type, and merchant-defined purchase type). The free Micro plan supports up to three items per order.

## Events

FraudLabs Pro documents an order-status-changed webhook configured manually in the account settings. This integration currently exposes request-response tools and does not register webhook subscriptions.

## Response compatibility

The screening and retrieval tools include the full provider response in `raw`, with credentials removed. Existing typed fields remain available. For screening details, documented unavailable scalar values are omitted from their typed projection while their original nulls remain in `raw`. Provider usage-type arrays appear as `ipGeolocation.usage_types`; the legacy `usage_type` string field remains available for string responses.

## Official documentation

- [Order screening](https://www.fraudlabspro.com/developer/api/screen-order)
- [Order feedback](https://www.fraudlabspro.com/developer/api/feedback-order)
- [Order result](https://www.fraudlabspro.com/developer/api/order-result)
- [SMS verification](https://www.fraudlabspro.com/developer/api/send-sms-verification)
- [OTP result](https://www.fraudlabspro.com/developer/api/get-sms-verification-result)
- [Payment feedback](https://www.fraudlabspro.com/developer/api/feedback-payment)
- [Order-status webhook](https://www.fraudlabspro.com/developer/webhook/order-status-changed)
