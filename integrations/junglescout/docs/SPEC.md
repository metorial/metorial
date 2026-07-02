Now let me fetch the developer documentation page for more details on authentication and the X-API-Type header:# Slates Specification for Jungle Scout

## Overview

Jungle Scout is an Amazon marketplace intelligence platform that provides data on product sales estimates, keyword search volumes, competitive analysis, and market trends. Its API offers programmatic access to Amazon marketplace data across 10 supported marketplaces (US, UK, DE, IN, CA, FR, IT, ES, MX, JP).

## Authentication

Jungle Scout uses **API Key authentication** via custom headers. There is no OAuth2 flow.

To authenticate:

1. Generate an API key from the Developer section of your Jungle Scout account. You will receive two values: a **Key Name** and an **API Key** (the API Key is only visible at the time of generation).

2. Include an `Authorization` header with the format `Key_Name:API_Key` (no spaces around the colon).

3. Every request requires the following headers:
   - `Authorization`: `{KEY_NAME}:{API_KEY}`
   - `X-API-Type`: Either `junglescout` (standard accounts) or `cobalt` (enterprise accounts)
   - `Accept`: `application/vnd.junglescout.v1+json`
   - `Content-Type`: `application/vnd.api+json`

4. All requests to the API must contain a `marketplace` query parameter. The API supports the following country codes: `us`, `uk`, `de`, `in`, `ca`, `fr`, `it`, `es`, `mx`, `jp`.

**Prerequisites:** You need a Jungle Scout account (Growth Accelerator or Brand Owner plans only) or a Jungle Scout Cobalt account with a customized API plan included. Two-factor authentication must be enabled on your account before using the API.

**Base URL:** `https://developer.junglescout.com`

## Features

### Keyword Research by ASIN

Query by ASIN and get back related keywords and data. Useful for discovering which keywords drive traffic to specific products, including search volume, suggested bid data, and competition metrics. Supports filtering by minimum search volume and sorting options.

### Keyword Research by Keyword

Query by keyword and get back related keywords and data. Allows exploring keyword ideas and variations starting from a seed keyword, returning related keywords with their associated metrics.

### Historical Search Volume

Query by keyword and get back weekly historical search volume. Enables trend analysis by showing how keyword search volume changes over time, useful for identifying seasonal patterns and market trends.

### Product Database Search

Query Amazon's catalog using multiple available inputs and get back matching ASINs and their latest known values, including sales estimates for the last 30 days. Supports filtering by categories, keywords, price ranges, and other product attributes. Useful for product research and identifying opportunities across Amazon's catalog.

### Sales Estimates

Query by ASIN and get daily historical sales estimates and price values for a selected date range. Provides historical data on estimated sales volume and pricing, enabling sales trend analysis and competitor monitoring over time.

### Share of Voice

Query by keyword and get the last known Brand Share of Voice plus limited keyword data. Shows how different brands compete for visibility on specific search terms, useful for competitive analysis and brand positioning assessment.

### Marketplace Support

Data is available in 10 marketplaces: US, UK, DE, IN, CA, FR, IT, ES, MX, and JP. All queries require specifying a target marketplace, and API keys are linked to a subset of allowed marketplaces.

## Events

The provider does not support events. Jungle Scout's API is a data query API that provides on-demand access to Amazon marketplace intelligence. There are no webhooks, event subscriptions, or purpose-built polling mechanisms available.
