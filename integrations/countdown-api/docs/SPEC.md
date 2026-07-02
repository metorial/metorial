Now I can see that "Countdown API" is by Traject Data and is an eBay product data API. Let me get more details from their documentation.Now let me get more details on the specific request types and the collections/destinations APIs.Now let me get the remaining request types and the collections/destinations info:Let me check the remaining type options and collections/destinations info:Now let me check the collections and webhooks/notifications setup:Now I have enough information to write the complete specification. Let me also check the full list of request types from the common parameters page:

Based on the documentation, the valid `type` values include: `search`, `product`, `reviews`, `seller_profile`, `seller_feedback`, and `autocomplete`. The API also mentions purchase history sales results. Let me also check the destinations API quickly.I have enough information now. Let me compile the specification.

# Slates Specification for Countdown API

## Overview

Countdown API, by Traject Data, is a real-time eBay product data API that retrieves structured product listings, customer reviews, search results, seller profiles, seller feedback, and autocomplete suggestions from 20 eBay domains worldwide. It provides real-time eBay product data, including product details, customer reviews, seller feedback, and search results, enabling businesses and developers to access comprehensive eBay marketplace information. Countdown API provides access to all of eBay's product inventory and allows you to easily look up product data by GTIN, ISBN, UPC, or EAN.

## Authentication

Countdown API uses API key authentication. Requests are authenticated by passing an `api_key` parameter as a querystring parameter to the API endpoint at `https://api.countdownapi.com/request`.

To obtain an API key, sign up for a free account at `https://app.countdownapi.com/signup`. The API key is then included as the `api_key` query parameter on every request.

Example request:

```
GET https://api.countdownapi.com/request?api_key=YOUR_API_KEY&type=search&ebay_domain=ebay.com&search_term=memory+cards
```

No OAuth or additional authentication flows are required. The same API key is used across all endpoints (core API, Collections API, Destinations API, Account API).

## Features

### eBay Product Search

Search for products across any of 20 supported eBay domains. Search parameters allow filtering by condition (new, used, open box, refurbished, etc.), sorting results, and specifying the number of results per page. Results include listing title, price, condition, auction/buy-it-now status, shipping info, seller details, and images.

### Product Data Retrieval

Retrieve detailed product data using an eBay Product ID (EPID), or look up products by GTIN, ISBN, UPC, or EAN. Product data includes attributes, images, pricing, stock status, condition, seller information, shipping details, returns policy, and auction status. Countdown API caches GTIN-to-EPID mappings for 2 months; use `skip_gtin_cache=true` to force a fresh lookup (costs 2 credits instead of 1).

### Customer Reviews

Retrieve customer reviews for a single product on eBay, specified using either the EPID and eBay domain parameters or a direct URL to an eBay product page. Results include review rating summary, rating breakdown, individual reviews with title, body, rating, date, reviewer profile, and verified purchase status. Reviews can be sorted (e.g., most recent).

### Seller Profile

Retrieve seller profile information for a given seller name on a given eBay domain. Returns seller name, positive rating percentage, follower count, location, profile image, description, and top-rated seller status.

### Seller Feedback

Request seller feedback information for a seller name or eBay seller feedback page URL. Provides feedback details left by buyers for a specific seller.

### Autocomplete Suggestions

Call the autocomplete endpoint for real-time search suggestions from eBay, helping discover exact product names, popular variations, and trending search terms.

### Collections (Bulk Requests)

Collections allow you to schedule requests to run en masse — up to 15,000 requests per collection — which can be scheduled to run monthly, weekly, daily, hourly, or manually on demand. Results are available in JSON, JSON Lines, or CSV formats. Results are retained for 14 days and can be downloaded. Collections are automatically deleted after 2 months of inactivity.

### Destinations

Set up destinations for results or notifications — collection results can be automatically uploaded to Amazon S3 or Google Cloud Storage buckets.

### Account Usage

Retrieve account usage and current platform status, including plan details, usage, and quota information.

### Error Logs

Review failed API requests to analyze the reasons why requests are failing, useful for debugging and monitoring integration health.

## Events

Countdown API supports webhooks for Collection completion notifications.

### Collection Result Set Completed

When a Collection has its `notification_webhook` property set, Countdown API will make an HTTP POST to this URL when the Collection completes and a new Result Set is available. The webhook payload includes collection ID, collection name, result set metadata (start/end times, request counts), and download links for results in JSON, JSON Lines, and/or CSV formats depending on collection configuration. If no webhook URL is supplied in the Collection's `notification_webhook` property, Countdown API will fall back to using the webhook URL defined on the account profile.

- The webhook has a 5-second timeout.
- Webhooks can be resent for a previously generated result set for debugging purposes.
