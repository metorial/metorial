Now I have enough information to write the specification.

# Slates Specification for Brilliant Directories

## Overview

Brilliant Directories is a platform for creating and managing online membership and business directory websites. It provides tools for managing members, listings, leads, reviews, payments, email campaigns, and content publishing. The API offers RESTful CRUD operations across core directory resources.

## Authentication

The REST API uses API key authentication. All HTTP requests are secured with an encrypted API Key, which must be sent in the `X-Api-Key` header.

**Generating an API Key:**

An admin must generate a unique API Key from within the site's Admin Dashboard by navigating to Developer Hub >> Generate API Key. The generated token must be saved immediately as it will not be accessible again after the window is closed.

**Required credentials:**

- **API Key**: Passed via the `X-Api-Key` HTTP header on every request.
- **Website Domain**: The base URL of the specific Brilliant Directories website (e.g., `https://mywebsite.com`). All API endpoints are relative to this domain (e.g., `https://mywebsite.com/api/v2/...`).

**Verifying a key:**

A `GET` request to `/api/v2/token/verify` can be used to verify if an API Key is valid.

## Features

### Member (User) Management

Create, read, update, delete, and search users in the directory database. Creating a member requires a minimum of an email, password (minimum 6 digits), and subscription_id (an existing Membership Plan ID). Members can be retrieved by ID or queried by any column such as email. By default, creating a member via API does not trigger a welcome email; an optional parameter can be sent to trigger it.

- When creating a member, the settings of the assigned Membership Plan are respected, such as pre-selected categories and listing types, unless overriding data is sent.
- When updating URLs (website, social media), the system validates formats and skips invalid URLs.
- Supports managing member credits (add, deduct, or override).

### Member Transactions & Subscriptions

Retrieve transaction history for members based on user_id or client_id. Retrieve subscription information for individual members.

### Leads Management

The API allows getting, creating, updating, matching, and deleting leads on the website. However, only one lead can be updated or deleted at a time. Leads can be matched by batching emails or IDs into a specific lead.

### Reviews Management

The API allows getting, creating, updating, deleting, and searching reviews on the website. Only one review can be updated at a time.

### Member Posts (Content Listings)

The API allows retrieving, creating, updating, searching, and deleting member posts on the website. Only one post can be updated at a time. Posts include single-image posts (Post - Standard) and multi-image posts (Post - Photo Album). Location-based searching requires enabling location features with a Google Maps API key in the site's Advanced Settings.

### Post Types (Categories)

Manage post type definitions (data categories) through the API — create, read, update, delete, and search post type configurations.

### Album Photos

Manage album images associated with member posts — create, read, update, and delete album photos.

### Widgets

Manage website widgets through the API — get, create, update, delete, render, and post widgets. Only one widget can be updated at a time.

### User Click Tracking

Create, read, update, and delete users' clicked links from the database.

### User Login Verification

The API provides an endpoint to verify user credentials, useful for websites that support SSO.

### Email Unsubscribe

Unsubscribe members from receiving email campaigns via the API. Only one member can be updated at a time.

## Events

Brilliant Directories supports webhooks that send data to a configured URL endpoint via POST when specific events occur. Webhooks allow sending real-time data from the application to another whenever a given event occurs. The functionality can send data to any URL endpoint, including intermediaries like Zapier, Pabbly Connect, or custom endpoints.

Webhooks are configured under Developer Hub >> Webhooks in the admin area. Custom webhooks can also be created and linked to any custom form or smart list.

### Form Submission Events

The following default webhook events are available, triggered by form submissions:

- **Member Review Submitted**: Triggered when a user submits a review for a member.
- **Contact Us Form Submitted**: Triggered when a user submits the Contact Us form.
- **Newsletter Signup**: Triggered when a user submits the Newsletter Signup form.
- **Newsletter Unsubscribe**: Triggered when a user submits the Newsletter Unsubscribe form.
- **Lead Submitted**: Triggered when a user submits the lead form.
- **Paid Member Signup (On-Site Gateway)**: Triggered when a member signs up for a paid plan using an on-site payment gateway.
- **Paid Member Signup (Off-Site Gateway)**: Triggered when a member signs up for a paid plan using an off-site payment gateway.
- **Free Member Signup**: Triggered when a member signs up for a free membership plan.
- **Member Import/Admin Update**: Triggered when a member is imported via CSV, added via Instant Business Data, added manually by an admin, or updated through the admin Quick Edit form.
- **Post - Standard**: Triggered when a standard (single-image) post is created or updated.
- **Post - Photo Album**: Triggered when a photo album (multi-image) post is created or updated.

### Smart List Events

Data from a Smart List can be sent to a webhook endpoint. Smart Lists are saved member search result sets. Webhooks can be configured for all smart lists globally or for specific individual smart lists. The system can automatically create a cron job that runs on a selected schedule for smart list webhooks.

### Custom Webhook Events

Custom webhooks can be created for any custom form or smart list by selecting from available forms and smart lists in the webhook configuration. Each custom webhook can be named and described for internal reference.
