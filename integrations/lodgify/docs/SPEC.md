# Slates Specification for Lodgify

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

Properties are read-only over the API. You can list properties, page through them, retrieve a single property's details, list its room types, list the rate add-ons available for a stay, and list the payment options a property has configured, which Lodgify describes as relevant when creating a booking. There is also a listing of properties deleted since a given date, which returns bare property IDs rather than full records. Creating, editing, and deleting properties is only possible in the Lodgify dashboard.

### Reservations & Bookings

The API lets you pull booking data directly into your dashboard, so you don't need to log into Lodgify every time a guest books. You can create new bookings, update their details, change booking statuses (booked, open via the `reopen` transition, tentative, declined), record actual check-in and check-out times, set the door key codes for each room type, list the channel-side bookings linked to a Lodgify booking, and move bookings to the trash or restore them. Trashing is a soft delete and is reversible. Booking creation returns only the new booking's ID, so fetching the full record is a separate call.

### Enquiries & Inbox

Enquiries are pre-booking guest requests and sit alongside bookings in Lodgify's inbox. You can create an enquiry, retrieve it, decline it, reopen it, and trash or recover it. A separate inbox listing returns bookings and enquiries together, filtered by status, property, or period. An existing enquiry can be upgraded into a booking, which preserves the enquiry's message history. Both bookings and enquiries can be marked as replied or not replied, individually or in a batch.

### Availability & Calendar Management

The API allows you to read or modify booking calendars, keeping your availability accurate on all connected booking sites. You can query availability for a whole property or a single room type over a date range, optionally including the booking details behind each period. Writes are made per room type and per period, and set the number of available units rather than a simple available flag, so multi-unit properties are addressable. Minimum-stay rules are part of pricing rather than availability.

### Rates & Pricing

You can update prices and set seasonal rates, giving you more control over your pricing strategy without logging into the platform daily. Rate management covers room type rates for specified date periods, with a nightly price plus optional minimum stay, maximum stay, and per-additional-guest pricing. Pricing is nightly only; there are no weekly or monthly rate fields. Note that a rate period's end date is exclusive on write, while the end date on the rates calendar read is inclusive, and that overlapping rate periods are rejected.

### Quotes & Payment Links

You can calculate a quote for a prospective stay, create a quote for an existing booking, and generate payment links. The typical flow is creating a booking, then creating a quote for that booking, then generating a payment link. Quotes include pricing breakdowns with fees and taxes. A property quote is calculated per rate plan, so it returns one entry per applicable plan. Creating a payment link accepts an amount only — the currency comes from the booking — and confirms success rather than returning the link, so the link is fetched separately. You can also send a guest a payment request derived from the booking's existing quote or payment schedule.

### Guest Communication

The API can automate messages like booking confirmations or check-in instructions, ensuring a consistent and timely guest experience. You can send a message on a booking or an enquiry, optionally notifying the guest, and supply an idempotency key so a retried send does not duplicate the message. You can also read a full message thread, including each message's delivery status, channel, and attachments, and whether the thread is closed to further replies.

## Events

This integration does not expose event triggers. Lodgify's own webhook endpoints are not covered here.
