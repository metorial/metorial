# Best Buy Integration Specification

## Overview

Best Buy is a major US consumer electronics retailer. Its Developer API provides read-only access to Best Buy's product catalog, store information, categories, product recommendations, and open box deals. A separate Commerce API is available to partners for order management and fulfillment.

## Authentication

Best Buy uses **API Key** authentication for its public APIs.

- To access the Best Buy API, developers must obtain an API key through the Developer Portal. This key is essential for authentication.
- Sign up for a developer API Key at https://developer.bestbuy.com/. The library requires an API key to be provided before it can be used.
- The API key is passed as a query parameter `apiKey` on each request. For example: `https://api.bestbuy.com/v1/products?apiKey=YourAPIKey&format=json`
- API-key applications and account eligibility are managed through the Developer Portal.

**Commerce API** (partner-only):

- Full documentation is supplied once you have a CAPI Key. Please contact Best Buy to request an invite to the Commerce API program and a corresponding API Key.

## Features

### Product Catalog Search

The Best Buy Product API provides a simple, REST-based interface for the entire product catalog, past and present. This includes pricing, availability, specifications, descriptions, and images for more than one million current and historical products. You can search by attributes like manufacturer, price, release date, customer reviews, category, and keywords. Supports AND/OR logic, wildcards, and the `in` operator for querying multiple values. Most product information is updated near real-time, including product pricing.

- Music and movie data may be used only where an ability to purchase the related music or movies from BESTBUY.COM is provided to end users.

### Category Browsing

The Categories API allows you to traverse the many categories on BESTBUY.COM and perform product searches based on category names or identifiers. Categories are returned as a hierarchical path from root to the most specific subcategory.

### Store Information

The Stores API provides addresses, location, hours and services offered for all Best Buy stores in the United States and Puerto Rico, including Best Buy Mobile locations and Best Buy Express kiosks. Supports location-based search using postal codes or latitude/longitude with a configurable radius distance.

### In-Store Product Availability

Near real-time availability can be retrieved for a specific SKU with exactly one store ID or postal code. The response contains `stores` and `ispuEligible`; postal-code searches cover a 250-mile radius. The tool reports the number of returned stores as `total` and preserves store fields, including nullable pickup estimates.

### Product Recommendations

The Recommendations API supports Trending, Most Viewed, Also Viewed, Also Bought, and Viewed Ultimately Bought. Trending and Most Viewed support category filtering; the other three require a SKU. Trending compares rolling three-hour viewing windows. Most Viewed accumulates at most 48 hours of views and refreshes every two hours; SKU-relative recommendations aggregate 30 days. Results include at most ten ranked products. Null short descriptions are omitted from the normalized result and retained in `rawResponse.results[].descriptions.short`. Numeric review scores are rendered as strings to preserve the existing tool output type; the original value remains in `rawResponse`.

### Open Box / Buying Options

The Buying Options API provides access to Open Box inventory including condition, reduced prices and other helpful product information. Open Box products can be queried by single SKU, a list of SKUs (up to 100), or by category. Each offer includes a condition rating (excellent or certified) and discounted pricing.

- Only available products are returned; inventory is refreshed every five minutes.
- Category queries support `page` and `pageSize`. SKU-list queries accept at most 100 entries and are not paginated. Original provider SKUs remain available in `rawResponse`; the normalized Open Box SKU remains numeric.

### Cursor Browsing

`browse_catalog` supports Products, Stores, and Categories using `cursorMark=*` initially and the returned `nextCursorMark` subsequently. It returns the complete provider response with credential query parameters removed from URLs. This provides deep catalog traversal without changing the existing page-based tools' output contracts.

### Errors and Authentication

Requests use the `apiKey` query parameter with a 30-second timeout. Credential parameters are removed from response URLs, and known API-key values are redacted from all returned response data and messages while preserving unrelated metadata, nulls, and cursor values. Blank API keys, malformed inputs, invalid required response fields, and upstream failures produce actionable service errors. This public catalog API has no current-user/profile endpoint, so no identity tool is exposed.

### Commerce (Partner-Only)

Commerce API functionality includes: Look up product availability, delivery dates, shipping costs prior to order submission; Create orders including Store Pick Up, Ship to Home and Home Delivery. Partners can also look up order information and modify or cancel orders. Access requires a separate CAPI key obtained through a partnership application.

## Official References

- [Best Buy API reference](https://bestbuyapis.github.io/api-documentation/)
- [API catalog and invite-only Commerce API](https://developer.bestbuy.com/apis)

## Events

The provider does not support events. The Best Buy API is a read-only data API with no webhook or event subscription mechanism.
