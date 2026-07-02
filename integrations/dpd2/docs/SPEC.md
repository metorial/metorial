Based on the search results, "Dpd2" refers to the DPD digital product delivery platform (getdpd.com), not the parcel shipping company. Let me get more details on their API.# Slates Specification for Dpd2

## Overview

DPD (Digital Product Delivery) is an e-commerce platform by Portal Labs for selling and delivering digital products such as e-books, software, music, videos, and keycodes. It provides hosted storefronts, shopping cart functionality, payment processing integration, subscription/membership areas, and automated digital fulfillment. The API (v2) is a read-only interface at `https://api.getdpd.com/v2/` that allows viewing account data including storefronts, products, purchases, subscribers, and customers.

## Authentication

Authentication is performed using standard HTTP Basic Authentication. The username is your account username and the password is the API password available on your profile.

To find your credentials: navigate to your DPD account and sign in, click on the User menu on the top right, and go to "Profile" > "DPD API Credentials".

- **Username**: Your DPD account username
- **Password**: Your API password (separate from your login password, found on your profile page)
- **Base URL**: `https://api.getdpd.com/v2/`

Example using cURL:

```
curl -u [username] https://api.getdpd.com/v2/
```

## Features

### Storefront Management (Read-Only)

View storefronts (also called stores/websites) associated with your DPD account. Storefronts are also called stores and websites in the DPD admin. Each storefront may have a subdomain (v2 storefronts only), which can be appended to dpdcart.com for the full domain.

### Product Catalog (Read-Only)

Retrieve product listings and details from your DPD account. There is no limit to what you can deliver with DPD — it supports PDF, MP3, Video, Zips, RARs, Images, and any other product type. Products may also include keycodes, tangible goods, and services. When an image is uploaded to a product, multiple sizes are created (from 50x50 up to 1000x1000).

### Purchase Data (Read-Only)

View purchase/order records, including filtering by various criteria. Purchase data includes tangibles to ship count, whether the customer receives email from product updates, and timestamps for when the purchase was created and last updated. You can also reactivate a purchase (the only write-like operation available).

### Subscriber Data (Read-Only)

View subscribers to your subscription/membership content areas. Vendors can create DPD-hosted subscriber "mini-sites" and sell recurring subscriptions for access to content, including scheduled content, drip feed subscriptions, and paid podcasts. The API exposes subscriber details and statuses, and allows verifying subscriber access.

### Customer Data (Read-Only)

Retrieve customer records associated with your DPD account. Customers can be listed and individually retrieved.

### Notification Verification

You can verify a POST from the URL integration by POSTing all of the parameters that were POSTed to your site. The response will either be VERIFIED or INVALID. This allows you to confirm that incoming purchase notifications genuinely originated from DPD.

### Important Limitations

- The DPD API is a read-only window into your DPD account. The API does not support modifying any data at this time. The only exception is purchase reactivation.
- This API is supported on the hosted site (\*.dpdcart.com) only.

## Events

DPD supports a **Notification URL** (IPN-style webhook) system for purchase events.

### Purchase Notifications

DPD supports sending purchase notifications to a URL of your choice, sending most of the same fields that PayPal sends in their IPN plus a few fields specific to the DPD service. This is configured in the DPD admin under Integrations > Notification URL.

- **Trigger**: Fires when a customer completes a purchase.
- **Payload**: Includes buyer information, purchase details, product information (name, ID, quantity, price, currency, SKU), and optionally delivered product keys.
- **Verification**: Notifications can be verified via the API's `POST /notification/verify` endpoint by re-posting all received parameters.
- The notification fields are compatible with the PayPal IPN POST vars format, making it straightforward to integrate with services already designed for PayPal IPN.
