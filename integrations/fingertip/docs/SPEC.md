# Fingertip specification

## Service status

The [official homepage](https://fingertip.com/) announces Fingertip's closure, dated 1 May 2026, and its transition to Linktree. The documentation below describes the retained historical API contract. Indexed endpoint documentation remains accessible in some cases, but current API availability and new API key creation have not been verified. This integration does not switch existing Fingertip credentials or resources to Linktree.

## Overview

Fingertip is an all-in-one business platform that lets users create websites, manage bookings, send invoices, process orders, and handle client contacts from a single place. It is aimed at small businesses, freelancers, and consultants who need a no-code website builder with integrated scheduling, e-commerce, and client management tools.

## Authentication

Fingertip uses **API key-based authentication** via Bearer tokens.

- **Historical API key setup:** The [REST API guide](https://docs.fingertip.com/rest-api) directs users to [fingertip.com/api-keys](https://fingertip.com/api-keys). Availability after the closure is unverified.
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

- The historical API supported page themes; theme management is not exposed by the current tools.

### Blocks

- Manage content blocks within pages. Blocks are the modular content elements (text, images, forms, etc.) that compose a page.

### Site Contacts

- Manage contacts associated with a site — the customers/clients who interact with the business through the site.

### Bookings & Event Types

- Manage bookings (appointments/scheduling) and the event types that define bookable services.
- Existing tools list bookings and event types and accept, decline, complete, reschedule, or cancel bookings. Creating bookings is not exposed.

### Blog Posts

- List published blog posts and retrieve their details and HTML content.

### Forms

- List form templates and existing form submission responses.

### Invoices

- List invoices with status filters and pagination. The provider's numeric invoice number is returned as a string to preserve the existing output contract.

### Orders

- List orders placed through a site's e-commerce functionality.

### Site Memberships & Invitations

- Historical provider capabilities; membership and invitation management are not exposed by the current tools.

### Workspaces

- Discover authorized workspaces. Workspace membership and invitation management are not exposed.

### Webhooks Management

- The historical provider API supported webhook management; webhook tools are not exposed by this integration.

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
