The search results about webhooks are all related to Segment (the CDP), not SegMetrics. Based on my thorough review of the SegMetrics API documentation, there is no webhook or event subscription system. Let me now compile the specification.

# Slates Specification for Segmetrics

## Overview

SegMetrics is a marketing attribution and analytics platform that tracks leads, revenue, and customer journeys across marketing tools and ad platforms. It combines data from CRMs, payment processors, and ad networks to provide cross-platform funnel analytics and ROI reporting.

## Authentication

SegMetrics uses API key authentication. The SegMetrics API uses two pieces of information to authorize your account.

- **Account ID**: Your Account ID is appended to the URL of each request that you'll make to the API.
- **API Key**: Your API Key is sent as an authorization header on each request. It is passed via the `Authorization` header.

You can find your Account ID and API Key in the SegMetrics Account page. Navigate to your Account Settings to retrieve both values. The API Key should be 22 characters long.

There are two separate API base URLs depending on the operation:

- **Import API** (for writing data): `https://import.segmetrics.io/api/v1/<account_id>/<integration_id>/`
- **Reporting API** (for reading data): `https://api.segmetrics.io/<account_id>/`

The Import API also requires an **Integration ID** in the URL path, which identifies the specific integration (e.g., a Custom CRM) within your SegMetrics account. This can be found on your Account Integrations page.

## Features

### Contact Management

The SegMetrics API v1 is a way to enable customers to import their own data into their SegMetrics account, either through a custom integration, or to modify existing information in their integrations. You can create, update, and delete contacts. Contact data includes name, email, status, UTM parameters, geographic data, custom fields, and tags.

- Contacts are identified by either `contact_id` or `email`.
- When updating custom fields, data will be appended to the existing data. Set the value to null in order to remove the custom field.
- Deleting a contact is permanent and does not remove associated invoices or purchases.

### Tag Management

You can add and remove tags on contacts. Tags can be submitted as tag IDs, tag names, or full tag objects (with id, name, and date). This is useful for syncing segmentation or lifecycle stage data from external systems into SegMetrics.

### Order / Invoice Management

You can add purchases (invoices) to contacts and delete invoices. Each invoice includes line items with product details, amounts (in cents), paid amounts, and refund status. If a product referenced in a line item doesn't exist, it is automatically created.

- Invoices are identified by a unique `id`; submitting an existing ID updates the invoice.
- Amounts are specified in cents.

### Subscription Management

You can create, update, and delete subscriptions for contacts. Subscriptions include billing cycle configuration (year, month, week, day), frequency, trial periods, and cancellation dates. Adding a subscription does not automatically create an associated order — that must be done separately.

### Product Management

You can add or update products in a SegMetrics integration. Products only require an `id` and a `name`.

### Ad Performance Tracking

You can record ad performance data (spend, clicks, impressions) for a specific date. The API supports creating ad campaigns, ad sets, and individual ads in a single call along with the performance data.

- Ad hierarchies (Campaign → Ad Set → Ad) can be created inline.
- Amounts are in cents; metrics are per-day.

### Reporting & Saved Reports

You can programmatically retrieve report data from SegMetrics for four report types: `leads`, `revenue`, `ads`, and `subscriptions`. Reports return KPIs, graph data (time series), and tabular breakdowns. You can filter by date range and configure the time scale (day, week, month). Saved report configurations created in the SegMetrics UI can be queried by their report ID.

### Customer Journey

You can retrieve the full customer journey for contacts within a report, including their page view events, tags, orders, subscriptions, and list memberships. This provides detailed attribution data such as UTM parameters, referrer URLs, ad IDs, and geographic information for each touchpoint.

### Visitor Identification (JavaScript API)

SegMetrics provides a JavaScript API for identifying website visitors and connecting them to contacts in your CRM. The `identify` command ties an email address to a web session. A server-side HTTP endpoint is also available for identifying contacts without the JavaScript snippet (e.g., from webhooks or backend systems), using the session UID.

## Events

The provider does not support events. SegMetrics does not offer webhooks or event subscription mechanisms. It is primarily a data-in (import) and data-out (reporting) platform.
