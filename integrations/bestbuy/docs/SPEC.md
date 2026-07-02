# Slates Specification for Bestbuy

## Overview

Best Buy is a major US consumer electronics retailer. Its Developer API provides read-only access to Best Buy's product catalog, store information, categories, product recommendations, and open box deals. A separate Commerce API is available to partners for order management and fulfillment.

## Authentication

Best Buy uses **API Key** authentication for its public APIs.

- To access the Best Buy API, developers must obtain an API key through the Developer Portal. This key is essential for authentication.
- Sign up for a developer API Key at https://developer.bestbuy.com/. The library requires an API key to be provided before it can be used.
- The API key is passed as a query parameter `apiKey` on each request. For example: `https://api.bestbuy.com/v1/products?apiKey=YourAPIKey&format=json`
- Best Buy will no longer support or provide API keys to those using free email services (e.g., Gmail/Yahoo). API keys are associated with a company and not an individual.

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

You can query the Products API together with the Stores API to find in-store availability of products. Near real-time availability can be retrieved for specific SKUs by store ID or postal code. Results include stock status and pickup time estimates.

### Product Recommendations

The Recommendations API allows you to pull Trending, Most Viewed and Also Viewed products based on customer behavior at BESTBUY.COM. Additional recommendation types include Also Bought and Viewed Ultimately Bought. All recommendations can be filtered by category. Results return the top ten ranked products.

### Open Box / Buying Options

The Buying Options API provides access to Open Box inventory including condition, reduced prices and other helpful product information. Open Box products can be queried by single SKU, a list of SKUs (up to 100), or by category. Each offer includes a condition rating (excellent or certified) and discounted pricing.

- Only available products are returned; inventory is refreshed every five minutes.

### Commerce (Partner-Only)

Commerce API functionality includes: Look up product availability, delivery dates, shipping costs prior to order submission; Create orders including Store Pick Up, Ship to Home and Home Delivery. Partners can also look up order information and modify or cancel orders. Access requires a separate CAPI key obtained through a partnership application.

## Events

The provider does not support events. The Best Buy API is a read-only data API with no webhook or event subscription mechanism.
