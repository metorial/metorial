# Slates Specification for Tripadvisor

## Overview

Tripadvisor is the world's largest travel platform, providing user-generated reviews, ratings, and photos for hotels, restaurants, and attractions. The API provides dynamic access to Tripadvisor content, allowing partners to integrate it into their websites and applications. Tripadvisor also offers connectivity solutions for hospitality industry partners, including hotel availability, booking, and review collection capabilities.

## Authentication

Tripadvisor uses **API key** authentication across its APIs.

### Content API

The Content API uses API Keys to authenticate requests. All API requests must be made over HTTPS.

To obtain an API key:
Go to www.tripadvisor.com/developers, sign up for a Tripadvisor account, and click "Create API key."

To include it with each request, set it as the value of the `key` query parameter.

Example: `https://api.content.tripadvisor.com/api/v1/location/search?key=YOUR_API_KEY&searchQuery=Bora Bora`

The Tripadvisor Content API is intended for consumer-facing (B2C) websites and apps only. An application must be approved by Tripadvisor before the key is granted full production access.

### Connectivity Solutions APIs (Review Express, Hotel Availability, etc.)

The Review Express API key is different from your TripConnect ID. Review Express API keys are emailed to connectivity partners as soon as the partner has accepted Review Express API Terms & Conditions.

To include it with each request, set it as the value of the `X-TripAdvisor-API-Key` header.

These APIs require a formal partnership with Tripadvisor and involve hotel-to-Tripadvisor location ID mapping.

## Features

### Location Search

Location Search returns a list of locations for a given search query. You can search by keyword or text query to find hotels, restaurants, and attractions. Locations are defined within this API as hotels, restaurants, or attractions.

### Nearby Location Search

Search for locations near a specific geographic point by providing latitude and longitude coordinates. Results can be filtered by category (hotels, restaurants, attractions).

### Location Details

Location Details provides access to comprehensive information about a location such as name, address, rating, and URLs for the listing on Tripadvisor. The response provides data such as name, address, overall traveler rating, number of reviews, link to read all reviews, link to write reviews, and additional data elements.

- Data includes ratings, rankings, subratings, awards, trip types, and geographic hierarchy.
- Supports localization via a `language` parameter.

### Location Reviews

Location Reviews provides the most recent reviews for a specific location.

- Returns up to 5 reviews per location.

### Location Photos

Location Photos provides access to high-quality recent photos for a specific location.

- Returns up to 5 photos per location.

### Location ID Mapping

Tripadvisor provides a `/location_mapper` call for Content API users, made using a mapper-specific API key, which is your API key plus "-mapper". This allows mapping external property identifiers to Tripadvisor location IDs using latitude/longitude coordinates.

### Review Express (Connectivity Partners)

The Review Express API enables connectivity partners to provide automated Review Express services to opted-in hotel partners — creating requests on their behalf to send emails to recent guests, encouraging a review of their experiences.

- Connectivity partners can create email requests from the point of booking up to one day after the check-out date for each guest record for opted-in hotels, and then modify or cancel those requests if the bookings change.
- Requires hotel location ID mapping and hotel opt-in to the Review Express program.
- Parameters include recipient email, check-in/check-out dates, language, and country.
- You can check opt-in status of mapped hotels in bulk.
- Review Express API is solely for collecting reviews.

### Hotel Availability Check (Connectivity Partners)

The Hotel Availability Check API is used by approved partners to show their prices and availability on the Tripadvisor website. This API also allows users to book reservations right on Tripadvisor, without redirecting to a hotel landing page.

- This is a partner-facing API where Tripadvisor calls the partner's endpoint to check availability and pricing.
- Supports detailed tax/fee breakdowns, cancellation policies, room types, rate plans, and amenities.

### TripConnect Campaign Data

Available to TripConnect partners to retrieve performance data about their advertising campaigns on Tripadvisor, including click and conversion metrics.

## Events

The provider does not support events. Tripadvisor's APIs are request-response based and do not offer webhooks or event subscription mechanisms.
