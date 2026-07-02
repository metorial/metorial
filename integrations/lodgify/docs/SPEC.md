Let me get more details on the API reference to understand all available features.# Slates Specification for Lodgify

## Overview

Lodgify is a vacation rental management platform that enables property owners and managers to create booking websites, manage reservations, synchronize listings across channels (Airbnb, Booking.com, Expedia, etc.), and automate guest communication. It provides tools to create a website, manage reservations, and automate communication with guests, allowing users to sync booking data, manage listings, and automate tasks for a seamless rental experience.

## Authentication

To make authorized calls on the Lodgify API, you need to provide an API key in the call. You can find your own API key in your settings page, after you log in to the website.

Specifically, navigate to your Lodgify account and sign in, then go to "Settings" > "Public API" in your Lodgify dashboard, where you can find your API key or request access.

The API key must be passed as a request header:

```
X-ApiKey: YOUR_API_KEY
```

Requests are made against the base URL `https://api.lodgify.com/v2/` (or `/v1/` for some legacy endpoints).

There is no OAuth2 flow; authentication is solely via API key.

## Features

### Property Management

You can create, edit, or remove property listings programmatically, which is useful when managing multiple listings on various platforms. This includes retrieving property details, room types, images, and amenities.

### Reservations & Bookings

The API lets you pull booking data directly into your dashboard, so you don't need to log into Lodgify every time a guest books. You can create new bookings, update booking statuses (open, booked, tentative, declined), and retrieve reservation details including guest information and transaction data.

### Availability & Calendar Management

The API allows you to read or modify booking calendars, keeping your availability accurate on all connected booking sites. You can query availability for specific date ranges and properties, and update availability periods.

### Rates & Pricing

You can update prices, set seasonal rates, or apply discounts, giving you more control over your pricing strategy without logging into the platform daily. Rate management covers room type rates for specified date periods.

### Quotes & Payment Links

You can create quotes for bookings and generate payment links. The typical flow involves creating a booking, then creating a quote for that booking, and optionally generating a payment link. Quotes include pricing breakdowns with fees and taxes.

### Guest Communication

The API can automate messages like booking confirmations or check-in instructions, ensuring a consistent and timely guest experience. You can receive and manage guest messages associated with bookings or enquiries.

### Webhook Management

You can subscribe to events by providing a target URL, list active webhooks, and unsubscribe by webhook ID. Webhooks are managed entirely through the API.

## Events

Lodgify supports webhooks that allow you to receive real-time notifications when certain events occur. You subscribe to a given event by providing a target URL (must be unique). The target URL should return a 200 OK; otherwise Lodgify will retry delivery up to 10 times.

Webhook payloads can be verified using a signature found in the `ms-signature` request header (format: `sha256=SIGNATURE`). Lodgify generates a unique secret key for each webhook endpoint, returned only at creation time.

### Booking Changes

Fires when a booking is created, updated, or its status changes (e.g., to booked, open, declined, tentative). Events include booking created, booking updated, and status changes to booked, open, declined, or tentative. The payload includes full booking details (property, dates, guest info, room types, source, currency, etc.).

### Availability Changes

Triggered when the availability for a property changes. The payload includes the property ID, affected room type IDs, start/end dates, and the source of the change.

### Rate Changes

Triggered when rates change for a property. The payload includes the property ID and the affected room type IDs.

### Guest Messages

Triggered when a new guest message is received in any thread belonging to the user. A thread could be associated with a booking or an enquiry.
