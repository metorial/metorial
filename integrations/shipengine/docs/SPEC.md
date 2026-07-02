Let me get more details on the webhook event types and some additional features.Now I have all the information I need. Let me compile the specification.

# Slates Specification for Shipengine

## Overview

ShipEngine is a multi-carrier shipping and logistics API that provides a unified interface for creating shipping labels, comparing rates, validating addresses, and tracking packages across carriers like FedEx, UPS, USPS, and DHL. It supports both parcel and LTL (Less-Than-Truckload) shipping, and offers pre-negotiated discounted rates for accounts shipping from the US, Canada, and the UK. ShipEngine is being rebranded as ShipStation API, but all endpoints and functionality remain the same.

## Authentication

To authenticate to ShipEngine, you need to include an `API-Key` header in each API call.

- **Method:** API Key via HTTP header
- **Header name:** `API-Key`
- **Base URLs:** `https://api.shipengine.com` (US) or `https://api.eu.shipengine.com` (EU)
- All API requests must be made using HTTPS and TLS 1.1 or higher.

**Obtaining an API Key:**
API keys can be found on the API Keys page of the ShipEngine account dashboard, which includes both production API keys for live carriers and Sandbox keys for testing.

**Sandbox vs. Production:**
Sandbox API keys have a `TEST_` prefix. Production API keys do not have this prefix.

**Example request header:**

```
API-Key: YOUR_API_KEY_HERE
```

There is no OAuth2 flow or scopes. API keys give full access to ShipEngine's functionality — there is no granular permission model per key.

## Features

### Address Validation

ShipEngine supports address validation for virtually every country on Earth, including the United States, Canada, Great Britain, Australia, Germany, France, Norway, Spain, Sweden, Israel, Italy, and over 160 others. Address validation ensures accurate addresses and can reduce shipping costs by preventing address correction surcharges. ShipEngine cross-references multiple databases to validate addresses and identify potential deliverability issues.

### Address Recognition (Parsing)

The address-recognition API extracts address data from unstructured text such as emails, SMS messages, support tickets, or other documents, returning structured address data.

- Address recognition is currently supported for the United States, Canada, Australia, New Zealand, the United Kingdom, and Ireland.

### Rate Shopping

Compare shipping rates across carriers to find the most cost-effective option. Rate estimates can also be retrieved with limited address information when full shipment details are not yet known.

- Supports rating multiple shipments at once.
- Supports duties and tariffs calculation for international shipments.
- Supports retrieving previously quoted rates.

### Shipping Labels

ShipEngine makes it easy to create shipping labels for any carrier and download them in a variety of file formats. Labels can be customized with your own messages and images.

- Labels can be created directly, from a rate quote, from a shipment, or from a sales order.
- Supports return labels, paperless labels, and branded labels with custom logos.
- Labels can be voided after creation.
- Supports batch label creation for bulk operations.

### Shipment Management

Create, update, list, and manage shipments with details including origin/destination addresses, package dimensions, weight, carrier service, and insurance.

- Supports multi-package shipments, international shipments with customs documentation, and delivery confirmation options.
- Supports third-party billing, collect on delivery, and dangerous goods declarations.
- Shipments can be organized using tags.
- Supports creating manifests (scan forms) for end-of-day carrier pickups.
- Shipping rules can automate carrier and service selection based on configured criteria.

### Package Tracking

Get the current status of a package or subscribe to real-time tracking updates via webhooks.

- Track by carrier code and tracking number, or by ShipEngine label ID.
- ShipEngine can track labels created outside of its API as long as it has an integration with the carrier.
- Supports a branded tracking portal with custom colors, logos, and social media links.

### Carrier Management

Connect your own carrier accounts to ShipEngine, or use built-in ShipEngine carrier accounts with pre-negotiated rates.

- List connected carriers, their available services, options, and package types.
- Connect and disconnect carrier accounts programmatically.
- Supports a wide range of carriers including FedEx, UPS, USPS, DHL Express, Canada Post, Royal Mail, DPD, and many more.

### LTL (Less-Than-Truckload) Shipping

Supports LTL freight shipping with a separate set of capabilities.

- Request quotes and spot quotes from LTL carriers.
- Schedule pickups and create Bills of Lading (BOL).
- Track LTL shipments.
- Each LTL carrier has different credential requirements that can be queried via the API.

### Warehouse Management

Create and manage warehouse locations that can be used as ship-from addresses on shipments and labels.

### Sales Orders

Connect and manage orders from external order sources via the Sales Order API.

- Import orders from connected marketplaces and e-commerce platforms.
- Create labels directly from sales orders.

### Service Points (PUDO)

Find carrier pick-up/drop-off (PUDO) locations and create labels for service point delivery.

### Pickup Scheduling

Schedule carrier pickups for your shipments.

## Events

ShipEngine supports webhooks that push real-time notifications to a configured HTTP endpoint when specific events occur. You can set up multiple URLs for the same event via the dashboard, though the API limits one URL per event. Webhooks can be configured via the dashboard or the API.

The following webhook event types are available:

### Tracking

Get updates on any tracking event. Fires whenever a tracking status changes for a subscribed package (e.g., accepted, in transit, delivered, exception). The payload includes tracking number, status code, carrier details, estimated/actual delivery dates, and a full event history.

### Batch Completed

Get updates for completed batches. Fires when a batch label processing operation completes.

### Rate Updated

Get updates when a shipment rate has been updated.

### Carrier Connected

Fires when a new carrier account is connected to your ShipEngine account.

### Report Complete

Fires when a requested report has finished generating and is ready for download.

### Order Source Refresh Complete

Fires when an order source (e.g., a connected marketplace) has completed a refresh of its orders.

### Sales Order Imported (Beta)

Fires when sales orders are imported from a connected order source. The payload includes full order details such as customer info, items, pricing, and shipping addresses.
