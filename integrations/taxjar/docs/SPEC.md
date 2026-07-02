Now let me fetch the full API reference to get details on all features:Now I have comprehensive information to write the specification.

# Slates Specification for Taxjar

## Overview

TaxJar is a sales tax automation platform that provides sales tax calculation, reporting, and filing services primarily for US-based businesses. It offers a REST API for real-time tax calculations, transaction management for reporting purposes, customer exemption handling, tax rate lookups, nexus tracking, and address validation.

## Authentication

TaxJar uses API keys to allow access to the API. TaxJar does not provide OAuth-based authentication; only token-based authentication is supported.

**Obtaining an API Token:**
If you're new to TaxJar, you'll need to sign up for an account to get your API key. Otherwise, log in and go to _Account > API Access_ to generate a new API token.

**Using the API Token:**
TaxJar expects the API key to be included in all API requests to the server via the `Authorization` header in one of two formats:

- `Authorization: Token token="YOUR_API_TOKEN"`
- `Authorization: Bearer YOUR_API_TOKEN`

**Sandbox Environment:**
TaxJar provides a sandbox environment for testing at `https://api.sandbox.taxjar.com/v2/`. A separate sandbox API token is required. The sandbox returns stubbed responses for transaction endpoints and approximate rates for calculations.

**API Versioning:**
TaxJar has introduced API versioning to deliver enhanced validations and features. To take advantage of an API version, `'x-api-version'` must be specified in API call request headers. `'x-api-version'` accepts a date in the form of a string: `'YYYY-MM-DD'`.

## Features

### Sales Tax Calculation

Calculate the exact sales tax that should be collected for a given order. Accepts origin (from) and destination (to) addresses, order amount, shipping, line items with product tax codes, and nexus addresses. Returns the total tax to collect with a detailed breakdown by jurisdiction (state, county, city, special district) and per line item.

- Supports origin-based and destination-based sourcing automatically based on the state.
- Handles shipping taxability per state rules.
- Handles product-level exemptions via product tax codes (e.g., clothing, food, software, digital goods).
- Supports customer-level exemptions via `customer_id` or `exemption_type` (wholesale, government, marketplace, other).
- Nexus can be provided per-request via `nexus_addresses` or stored in the TaxJar account.
- TaxJar has limited functionality for international calculations and it is only supported for users who have this feature currently implemented.

### Tax Rate Lookups

Retrieve the combined sales tax rate for a given US location by ZIP code, with optional city, state, and street address for greater accuracy.

- Returns rates broken down by state, county, city, and combined district.
- Indicates whether freight/shipping is taxable at that location.
- Does not support nexus determination, sourcing based on a ship from and ship to address, shipping taxability, product exemptions, customer exemptions, or sales tax holidays.

### Summarized Rates

Retrieve minimum and average sales tax rates for all US regions/states, intended as a backup/fallback data source.

### Product Tax Categories

List all supported product tax categories and their corresponding tax codes. Categories cover clothing, food & groceries, supplements, software, digital goods, services, and many more specialized items. These codes are used in tax calculations and transactions to apply correct exemption rules.

### Order Transaction Management

Create, list, show, update, and delete order transactions in TaxJar for sales tax reporting and filing purposes. Each order includes transaction ID, date, shipping addresses, amounts, shipping costs, sales tax collected, and line items.

- Transactions can be filtered by date range.
- Supports a `provider` parameter for marketplace sources (e.g., Amazon, eBay, Facebook).
- Only affects API-created transactions; does not modify transactions from other channels.
- TaxJar API endpoints provide detailed US-based sales tax rates and calculations. They also support extended US-based reporting and filing capabilities for TaxJar users.

### Refund Transaction Management

Create, list, show, update, and delete refund transactions linked to original orders. Refunds use negative monetary amounts and reference the original order's transaction ID.

### Customer Exemption Management

Create, list, show, update, and delete exempt customers (wholesale, government, etc.). Customers can be designated as exempt in specific regions or everywhere. Once created, pass the `customer_id` to tax calculation or transaction endpoints to automatically apply exemptions.

- Exemption types: `wholesale`, `government`, `other`, `non_exempt`.
- Exempt regions can be specified per country and state.

### Nexus Regions

List all nexus locations (regions where the business has tax obligations) configured in the TaxJar account. Returns country and region codes.

### Address Validation

Validate a US customer address and receive standardized address matches with ZIP+4 precision. Supports full address or ZIP-only validation, and can return multiple address match candidates.

- Requires a TaxJar Professional or higher subscription.
- Only US addresses are supported.

## Events

The provider does not support webhooks or event subscriptions through its API. TaxJar's API is request/response only, with no built-in mechanism for push-based event notifications.
