Now let me check for webhook support:Now I have enough information to write the specification.

# Slates Specification for Gatherup

## Overview

GatherUp (formerly GetFiveStars) is a customer feedback and online review management platform. It allows businesses and agencies to request and track customer feedback, manage online reviews across multiple platforms, and encourage customers to leave reviews. The platform consolidates reviews from multiple external sources such as Google and Facebook into a single dashboard.

## Authentication

GatherUp supports two authentication methods for its REST API (base URL: `https://app.gatherup.com/api`):

### 1. Bearer Token Authentication (Recommended)

To authorize API calls, you need two credentials: a Bearer Token and a clientId.

- The Bearer Token should be added in the `Authorization` header of the request as `Bearer BEARER_TOKEN`.
- The clientId should be added to the parameter (for GET) or body (for POST, PUT, DELETE) calls.
- To find your credentials, click on your profile in the top right of the GatherUp dashboard and select "Account Owner Details" — there you can find your Client ID and Bearer Token.

### 2. Hash-based Authentication (Legacy)

This method requires a `clientId` and a `privateKey`. Each request is signed by computing a SHA-256 hash of the private key concatenated with sorted request parameters. The resulting hash is sent as a `hash` parameter with every request. No change is needed for existing API users — hash-based authentication is still supported.

### Agency / Multi-Client Accounts

Agency accounts contain multiple sets of API credentials — one for the entire account (Global API) and a set of credentials for each client. When using Global API credentials, an optional `agent` parameter can be added to any API call to specify which client the operation targets. The `agent` value is a numeric identifier for the client within the agency dashboard.

## Features

### Business Management

Create, update, delete, search, deactivate, and reactivate business locations. Retrieve lists of businesses and business types. Each business represents a location being managed in GatherUp.

- Businesses have associated online review links that can be configured (add, update, retrieve).
- Notification email addresses can be managed per business.

### Customer Management

Create, update, delete, and retrieve customers associated with a business. Supports both single and bulk customer creation.

- The most common integration use case is to sync a CRM, POS, or other customer contact software with GatherUp to automatically request feedback.
- Customers are identified by email and/or phone number and are associated with a specific business location via `businessId`.

### Feedback Requests & Collection

Send feedback requests to customers via email or SMS and configure automatic feedback request sequences.

- Requests can capture Net Promoter Score (NPS), 5-star ratings, survey questions, 1st-party reviews, and/or 3rd-party reviews.
- Auto-feedback request settings can be configured per business to automatically send requests when customers are added.

### Feedback & Review Retrieval

Retrieve first-party feedback received through GatherUp, feedback responses, and show/hide history. Retrieve third-party online reviews monitored from external platforms (Google, Facebook, etc.).

- Results can be filtered by business and date range.
- Facebook recommendations can be retrieved separately.

### Survey Results

Retrieve aggregated survey results for a business and individual customer survey answers.

### Review Responses

Reply to customers who have left first-party feedback and reply to third-party online reviews (e.g., Google, Facebook) directly through the API.

### Reviews Widget

Retrieve embeddable HTML for a reviews widget that displays customer reviews on a website using Schema.org markup.

### Google Q&A

Retrieve Google Questions & Answers associated with a business listing.

### User Management

Create and manage users (managers) who can access the GatherUp dashboard. Set passwords, update user information, manage which businesses a user can access, and activate/deactivate users.

### Agency Client Management

For agency accounts, create new clients, retrieve a list of all clients with their agent IDs, and find the agent ID for a specific business location.

## Events

GatherUp supports webhooks in a limited, manually-configured fashion. GatherUp sends notifications as HTTP POST requests with a JSON body to specified endpoints.

### Outbound Webhooks — Feedback Received

- GatherUp sends feedback data as JSON when new feedback is received.
- To set up outbound webhooks, you must contact support@GatherUp.com with your business name and the receiving URL. There is no self-service webhook configuration through the API or dashboard.

### Inbound Webhooks — Customer Creation

- GatherUp can ingest inbound webhooks containing customer information. A common use case is to create a new customer via webhook. Setup requires contacting support@GatherUp.com with an example payload URL.

Note: Webhook setup is not self-service and requires coordination with GatherUp support for both inbound and outbound configurations.
