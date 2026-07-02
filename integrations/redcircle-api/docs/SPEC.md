Now let me get more details on the collections webhook feature and the destinations API:The Countdown API (a sibling product from Traject Data) shows the webhook pattern that RedCircle API also uses for collections. Let me look for the RedCircle-specific collections webhook docs.I now have sufficient information to write the specification. Based on all the research, RedCircle API by Traject Data is a Target product data extraction API. It supports webhooks on collections (same pattern as their sibling APIs like Countdown API and Rainforest API). Let me compile the specification.

# Slates Specification for RedCircle API

## Overview

RedCircle API, by Traject Data, is a real-time data extraction API for retrieving publicly available product data from Target (the US retailer). It provides product details, pricing, availability, fulfillment information, and more, with results returned in JSON or CSV formats. It is an unofficial API for Target built for businesses in e-commerce.

## Authentication

RedCircle API uses API keys for authentication.

- Sign up for a free account at `https://app.redcircleapi.com/signup` to obtain an API key.
- The API key is passed as a query string parameter named `api_key` on every request.
- Base URL: `https://api.redcircleapi.com`
- Example request: `https://api.redcircleapi.com/request?api_key=YOUR_API_KEY&type=search&search_term=highlighter+pens`

There are no OAuth flows, scopes, or additional credentials required. All authentication is handled via the single `api_key` parameter.

## Features

### Product Data Retrieval

Retrieve detailed information for individual Target products, including title, description, pricing, availability, fulfillment options (shipping, in-store pickup), images, videos, specifications, ratings, reviews, and seller information. Products can be looked up by TCIN, DPCI, or URL. RedCircle API can automatically convert UPCs, GTINs, or ISBNs to TCINs.

### Product Search

Search all of Target's inventory by criteria such as UPC, SKU, product name, and more. Results include product details per search result, position, related queries, categories, facets, and pagination. Results can be sorted (e.g., by best seller) and filtered by brand, price, color, and other facets.

### Customer Reviews

Retrieve customer reviews for a specific product on Target, including review ratings, text, and metadata.

### Category Browsing

The Categories API allows you to retrieve Target category IDs to use in category requests. You can browse Target's category listings to discover products within specific categories.

### Zipcode-Based Localization

The Zipcodes API allows you to set up zipcodes to localize your requests. View product results by specific United States zip codes to help understand shipping and product variances. Zipcodes can be added, listed, and deleted on your account.

- Zipcodes take approximately 2 minutes to become active after being added.

### Collections (Bulk/Scheduled Requests)

Designed for high-scale applications, RedCircle API Collections allow you to schedule requests to run en masse and retrieve the results on demand. Run up to 15,000 requests at a time with Collections.

- Collections can be run manually or on a schedule.
- Results are organized into Result Sets that can be downloaded in JSON or CSV format.
- A `notification_webhook` URL can be configured on a collection to receive an HTTP POST when a collection run completes.

### Destinations (Cloud Storage Export)

The Destinations API allows you to manage destinations. Destinations allow collection results to be automatically uploaded to Amazon S3 or Google Cloud Storage buckets.

### Account Management

Retrieve account information including usage metrics, credits remaining, and platform status. View error logs for troubleshooting failed requests.

## Events

RedCircle API supports webhooks on Collections. When a Collection has its `notification_webhook` property set, RedCircle API will make an HTTP POST to this URL when the Collection completes and a new Result Set is available. If no webhook URL is supplied on the Collection, it falls back to the webhook URL defined on your account profile.

### Collection Completion

- **Description:** Fires when a collection finishes executing all its requests and a new Result Set is ready for download.
- **Configuration:** Set the `notification_webhook` property on a collection, or define a default webhook URL on your account profile. You can also configure whether the webhook body includes JSON and/or CSV download links via the `notification_as_json` and related properties.
- You can resend a previously configured webhook POST request for a result set for debugging purposes.
