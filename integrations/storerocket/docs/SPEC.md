# Slates Specification for Storerocket

## Overview

StoreRocket is a store locator software platform that enables businesses to add customizable, embeddable location finders to their websites. It provides a customizable and easy-to-install store locator solution for websites, enabling businesses to display their physical locations interactively. It is built for WordPress, Shopify, SquareSpace, Bigcommerce, Joomla and any other website.

## Authentication

StoreRocket uses API keys for authentication. All API requests use HTTPS with API key authentication. No OAuth flow or complex setup is required.

The API token is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer {api_token}
```

The base URL is `https://storerocket.io/api/v2/` and requests should include an `accept: application/json` header.

API access availability depends on your StoreRocket plan. Check your StoreRocket account settings for API key availability.

## Features

### Account & User Management

Retrieve information about the authenticated StoreRocket account, including account details, plan information, and locator settings. The Get User Info endpoint returns account-level data including store configurations. The Get Users endpoint retrieves all users with pagination using limit and offset parameters. The Get Users endpoint returns all users associated with your StoreRocket account. The agent can list users with their roles and permissions, supporting team access audits.

### Location Management

While StoreRocket's API specifications are not publicly documented, endpoint information comes from third-party sources like Pipedream, which indicate they provide REST APIs for location management. Through the API, you can access location data including store addresses, phone numbers, operating hours, and other details. Location data can be filtered based on geographic proximity. When a customer provides a city, zip code, or address, it can be matched against store location records to present the nearest options with addresses and contact details.

- Locations support custom fields, search filters (tags by type, product, or category), custom map markers, and images.
- Locations can show if they are open or closed in real time, with reusable opening hours that can be assigned to multiple locations.
- Bulk import of locations is available through CSV or via the Google Sheets sync tool.

**Limitations:** The API specifications are not publicly documented, so available endpoints beyond account/user management and location retrieval may be limited or undocumented. The API surface exposed through third-party integrations (such as Pipedream) currently focuses on reading account information and user data, with three known actions: get user info, get users, and a health check ping.

### Google Sheets Sync

StoreRocket's Google Sheets integration allows keeping locations tidy and organized and automatically syncing them to the store locator. This is a native sync capability managed through the StoreRocket dashboard rather than the REST API.

### Analytics

Visual analytics are provided within the StoreRocket backend in order to aid businesses in understanding how their customers interact with the store locator tool. Gain insight into customer behavior with analytics on how customers are interacting with the store locator tool. Find out which locations are most popular, which are not being searched for, and more. Analytics access appears to be limited to the dashboard; it is unclear whether analytics data is exposed through the REST API.

### Lead Collection

When users can't find any locations nearby, they can leave their information so the business can get in touch with them in the future for sales and offers.

## Events

The provider does not support events. StoreRocket's API specifications are not publicly documented, and there is no confirmed webhook or event subscription system available. Webhook availability for StoreRocket requires verification.
