Now let me check the webhook details from the order submission endpoint:# Slates Specification for Finerworks

## Overview

FinerWorks is a print-on-demand and order fulfillment service specializing in fine art and photo printing. It is a leading print-on-demand and order fulfillment service specializing in high-quality art and photo printing. Products include canvas prints, greeting cards, posters, picture frames, ceramic tiles, tote bags, notebooks, puzzles, pillows, drinkware, and acrylic plaques.

## Authentication

FinerWorks uses API key-based authentication with two required credentials:

1. **`web_api_key`** – Your web API key tied to your FinerWorks account.
2. **`app_key`** – Your application key, which can be toggled between test and live modes.

To get started you will need to retrieve your `web_api_key` and `app_key`. Both can be found when you login to your FinerWorks account.

These should be included as request parameters in the header of any request. Alternatively you can include these as querystring parameters in the request URI.

Headers should be set as:

- `web_api_key: <your-web-api-key>`
- `app_key: <your-app-key>`

**Test Mode:** While building and testing your app, your app credentials should be marked as in test mode or your API calls should include `test_mode = true`. While in such a testing mode nothing will be processed or billed. All responses will be valid and simulate what you receive in a live environment.

Credentials can be retrieved and managed (including switching between test and live modes) at `https://finerworks.com/MyAccount/MyWebApi.aspx`.

## Features

### Order Management

Submit, update, and track print-on-demand orders. Orders can be submitted (up to 5 at a time) including customer details (sender and recipient) as well as line item details and optional display fields for the packing slip. Each order includes recipient shipping information, line items referencing product SKUs or product codes, shipping method, and optional fields like gift messages and custom data. You can change the submission status of an order (e.g., hold, cancel) prior to it being placed in production. Once an order is in production, changes require contacting customer support. Notes can also be added to an order's log for reference purposes.

### Order Status Tracking

Retrieve an order's current production status, including shipment details such as tracking numbers, shipment dates, and delivery dates. A list of all available production status definitions can also be retrieved for reference.

### Product & Pricing Catalog

Browse available product types, media types, and style types. Product codes are used when supplying images for printing and specify the desired printing surface, media type, mounting, and framing options. Retrieve pricing breakdowns based on product codes or virtual inventory SKUs. Get product details including pricing based on SKU and quantity.

### Virtual Inventory (SKUs)

The virtual inventory is the "glue" that binds your website's products with FinerWorks' fulfillment center. SKUs are entered in the `product_sku` field of various API calls. SKUs are beneficial when you have identical printed items to submit for ordering at different times. They are unique identifiers generated for each inventory item.

### Image File Management

Upload, list, update, and delete image files in your FinerWorks library. Images can be associated with virtual inventory items. Updating or deleting images that are assigned to the inventory library will also affect any virtual inventory products assigned to those images. File selection management is also available for grouping selected files.

### Framing Options

Browse frame collections, retrieve frame details, list available mats and glazing/glass options. A frame builder tool allows you to submit framing specifications to validate options, get pricing, and receive visual preview data (base64 image data) for the frame package.

### Shipping

Retrieve available shipping options with the required `shipping_code` to be used when submitting an order. Shipping options can be queried for single or multiple orders at once. Custom UPS or FedEx account numbers can be provided per order.

### Address Validation

Validate and test an address such as an order's recipient before submitting orders.

### Customer Management

Update an existing order's customer/shipping information after order submission.

### User Account

Retrieve and update user profile/account features via the API.

## Events

FinerWorks supports per-order webhook notifications for order status changes. When submitting an order, you can provide a `webhook_order_status_url` field with a callback URL. FinerWorks will send notifications to this URL when the order's status changes (e.g., when the order moves to production, ships, etc.).

### Order Status Updates

- **Description:** Receive notifications when an order's production status changes, including transitions through stages such as accepted, in production, and shipped.
- **Configuration:** The `webhook_order_status_url` is set on a per-order basis at the time of order submission. Each order can have its own unique webhook URL.
