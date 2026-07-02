Now let me get more details on the API features by looking at a few more sections:# Slates Specification for Fingertip

## Overview

Fingertip is an all-in-one business platform that lets users create websites, manage bookings, send invoices, process orders, and handle client contacts from a single place. It is aimed at small businesses, freelancers, and consultants who need a no-code website builder with integrated scheduling, e-commerce, and client management tools.

## Authentication

Fingertip uses **API key-based authentication** via Bearer tokens.

- **Obtaining an API key:** Log in to your Fingertip account and generate a key at [fingertip.com/api-keys](https://fingertip.com/api-keys).
- **Base URL:** `https://api.fingertip.com/v1`
- **Usage:** Include the API key in the `Authorization` header of every request as a Bearer token:
  ```
  Authorization: Bearer YOUR_API_KEY
  ```
- The API only supports HTTPS; HTTP is not supported.
- No OAuth2 or additional scopes are documented. Authentication is solely via the API key.

## Features

### Site Management

- Create, read, update, and delete sites (websites). Each site represents a full business website within Fingertip.
- Retrieve comprehensive site analytics.

### Page Management

- Manage pages within a site: create, list, retrieve, update, and delete pages.
- Pages have properties such as name, slug, description, banner media, logo media, social icons, and position ordering.

### Page Themes

- Manage visual themes for pages, allowing customization of the look and feel of individual pages on a site.

### Blocks

- Manage content blocks within pages. Blocks are the modular content elements (text, images, forms, etc.) that compose a page.

### Site Contacts

- Manage contacts associated with a site — the customers/clients who interact with the business through the site.

### Bookings & Event Types

- Manage bookings (appointments/scheduling) and the event types that define bookable services.
- Supports creating, rescheduling, and cancelling bookings.

### Blog Posts

- Create and manage blog posts associated with a site.

### Forms

- Manage forms and collect form submissions from site visitors.

### Invoices

- Create and manage invoices for clients, supporting the billing workflow.

### Orders

- Manage orders placed through a site's e-commerce functionality.

### Site Memberships & Invitations

- Manage memberships and invitations for a site, controlling who has access or roles on a given site.

### Workspaces

- Manage workspaces, which serve as organizational containers. Includes workspace memberships and invitations for team collaboration.

### Webhooks Management

- Register and manage webhook endpoints via the API to receive real-time event notifications.

## Events

Fingertip supports webhooks for real-time event notifications. Webhooks are registered through the Fingertip dashboard and deliver POST requests to a configured endpoint. Each webhook payload includes an event ID, a Unix timestamp, the event type, and event-specific data. Webhook signatures are provided via the `x-webhook-signature` header using HMAC SHA-256, allowing verification of authenticity.

### Booking Events

- **booking.created** — Triggered when a new booking is created.
- **booking.rescheduled** — Triggered when a booking's time is changed.
- **booking.cancelled** — Triggered when a booking is cancelled.

### Order Events

- **order.created** — Triggered when a new order is placed.

### Form Events

- **form_response.created** — Triggered when a new form submission is received.

### Contact Events

- **site_contact.created** — Triggered when a new site contact is added.
