Let me get more details from the API docs on GitHub.Now let me check the v1 API docs for more details on booking and authentication.Now I have enough information to write the specification. Let me compile what I've found.

# Slates Specification for Headout

## Overview

Headout is an online marketplace for booking tours, activities, attractions, and experiences in cities worldwide. It enables travelers to explore and book tours, activities, events, and local experiences. Founded in 2014 with headquarters in New York, the platform offers experiences across destinations including New York, Dubai, Paris, London, Rome, and many others.

## Authentication

Headout uses API key-based authentication. Auth keys are provided by Headout via email to approved partners. To obtain an API key, contact partnerships@headout.com or apikey@headout.com.

The API key is passed as a custom HTTP header called `Headout-Auth` on every request:

```
Headout-Auth: <YOUR_API_KEY>
```

The auth keys are primarily required for booking APIs; other APIs can technically be used without auth, though it is strongly recommended to include the key on all calls. Headout provides both a test key (for internal testing) and a production key. All bookings made through the production key are treated as official bookings.

There are no OAuth flows, scopes, or additional credentials required. The API key alone is sufficient for all operations.

## Features

### Product Discovery

Retrieve a catalog of Headout products (tours, tickets, experiences) available in a given city. Products can be filtered by city code (e.g., `NEW_YORK`, `DUBAI`), collection, category, subcategory, campaign name, language, and currency. The order of products in the response is determined by best-selling and trending patterns.

### Product Details

Retrieve full details of a specific product, including images, text descriptions, FAQs, reviews, and variant information. Each product can have multiple variants (e.g., "Skip the Line", "General Admission"), each with its own pricing type, inventory, and required input fields for checkout.

### Collections, Categories, and Subcategories

Access curated collections of experiences organized by city and language. Products are organized into categories (e.g., "Tickets") and subcategories (e.g., "Landmarks"), which can be browsed and used as filters.

### Inventory and Pricing

Fetch real-time inventory and pricing for a specific product variant. Inventory data includes available dates, times, and remaining capacity. Inventory can be per-person (with ticket types like Adult, Child) or per-group (bulk tickets of a single type); approximately 95% of products use per-person pricing. Inventory is volatile and should be refreshed frequently to ensure accurate pricing and availability.

### Booking

The booking process is a two-step flow: the first step confirms that Headout can fulfill the booking, and the second step confirms that the user has been charged and triggers post-purchase steps. Required input for a booking includes the selected product variant, inventory (date/time), passenger count, and customer details. Email, full name, and phone number are mandatory fields for the primary user.

- Bookings can fail if the inventory has become stale between the time it was fetched and the booking attempt.
- Cancellation is not currently supported via the API; cancellation requests are handled by Headout's support team.

### Localization

Product data, collections, categories, and URLs are available in multiple languages (EN, ES, FR, IT, DE, PT, NL) and can be returned in different currencies, enabling localized experiences for end users.

## Events

The provider does not support events. Based on the available documentation, Headout's API does not offer webhooks, event subscriptions, or purpose-built polling mechanisms for receiving real-time notifications about changes to products, inventory, or bookings.
