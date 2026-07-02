Now let me fetch the webhook event types page and the main product page for a more complete picture:The Blackbaud developer portal pages render dynamically and don't return content via fetch. I have enough information from my searches to write the specification.

# Slates Specification for Blackbaud

## Overview

Blackbaud is a cloud software provider serving nonprofits, educational institutions, and social good organizations. Its platform includes products for fundraising and donor management (Raiser's Edge NXT), financial management (Financial Edge NXT), education management, and more. The SKY API is Blackbaud's primary integration platform, providing REST APIs across these products.

## Authentication

Blackbaud's SKY API uses **OAuth 2.0 Authorization Code Flow** for authentication. This is the only supported flow for SKY API and requires a server-side component to store the client secret securely.

### Prerequisites

1. **Blackbaud Developer Account**: Register at the Blackbaud developer portal to create an application.
2. **Application Credentials**: When an application is created, you receive an **Application ID** (OAuth `client_id`) and a **Primary Application Secret** (OAuth `client_secret`).
3. **Subscription Key**: You must subscribe to the "Standard APIs" plan in the developer portal. This provides a **subscription key** (also called `Bb-Api-Subscription-Key`) that must be included as a header in every API request.
4. **Marketplace Connection**: A Blackbaud environment admin must connect your application via the Blackbaud Marketplace using your Application ID.

### OAuth 2.0 Authorization Code Flow

- **Authorization endpoint**: `https://oauth2.sky.blackbaud.com/authorization`
- **Token endpoint**: `https://oauth2.sky.blackbaud.com/token`
- **Redirect URI**: Must be configured in the application settings and match the redirect URI sent in the authorization request.

The flow works as follows:

1. Redirect the user to the authorization endpoint with your `client_id`, `redirect_uri`, and `response_type=code`.
2. The user authenticates with their Blackbaud ID and grants consent.
3. Blackbaud redirects back with an authorization `code`.
4. Exchange the code for an `access_token` and `refresh_token` at the token endpoint.
5. Include the access token as a `Bearer` token in the `Authorization` header and the subscription key in the `Bb-Api-Subscription-Key` header on all API calls.

Refresh tokens expire 365 days after creation and will need to be regenerated.

### Scopes

Scopes are configured at the application level (not at the OAuth request level) and define access per Blackbaud product. Options include:

- **Full data access** – The application can operate in the context of the consenting user's permissions across all solutions, including future solutions.
- **Limited data access** – Specify per-solution access: **Read** (view data), **Write** (view and change data), **Delete** (view, change, and delete data), or **Subscribe to events** (receive webhook notifications).
- **No data access** – For applications that don't require access to environment data.

When scopes are changed, an admin for the Blackbaud customer must review and approve the change before it takes effect.

### Required Headers for API Calls

| Header                    | Value                           |
| ------------------------- | ------------------------------- |
| `Authorization`           | `Bearer {access_token}`         |
| `Bb-Api-Subscription-Key` | Your developer subscription key |

## Features

### Constituent Management (Raiser's Edge NXT)

Manage constituents — the individuals and organizations who support your organization, including donors, prospects, volunteers, and general supporters. You can create, read, update, and delete constituent records along with related data such as addresses, email addresses, phone numbers, online presence, relationships, constituent codes, custom fields, communication preferences, notes, and attachments.

### Gift and Donation Management (Raiser's Edge NXT)

Manage gift information and related entities such as gift splits, gift fundraisers, and soft credits. Supports creating and tracking various gift types including pledges, recurring gifts, and one-time donations. Includes gift batches, acknowledgements, tributes, payment methods, and gift-level custom fields and notes.

### Fundraising and Opportunity Tracking (Raiser's Edge NXT)

Track interactions and tasks (actions) required to secure gifts and cultivate relationships with constituents. Manage fundraising opportunities (proposals), campaigns, funds, and appeals. Campaigns represent overall fundraising efforts or initiatives, such as operating expenses, new buildings, and endowments.

### Prospect Management (Raiser's Edge NXT)

Manage prospect status and prospect research data. Track prospect assignments to fundraisers and cultivation activities.

### Financial Management (Financial Edge NXT)

Manage accounting data including general ledger accounts, journal entries, account codes, projects, grants, and transaction distributions. Also covers accounts payable functionality such as invoices and vendors.

### Education Management

Manage school-related data including students, academics, admissions, schedules, athletics, and school user records. The education management APIs support K-12 school operations.

- Note: Education Management also has a legacy "ON API" that uses key/secret token-based authentication, but Blackbaud is no longer expanding the ON API and recommends new development use SKY API for Schools instead.

### Lists and Queries

Access and run pre-built or custom lists from Raiser's Edge NXT and Financial Edge NXT. Blackbaud added the SKY Query API for Raiser's Edge and Financial Edge, allowing you to define query criteria and retrieve filtered result sets.

## Events

The Webhook API enables third-party applications to subscribe to specific events that happen within the Blackbaud system — for example, when constituents change their contact information. When you subscribe, your application provides an endpoint URL to be called when the event occurs. In environments where your application has been enabled, Blackbaud sends the request to that endpoint. Webhook payloads use the CloudEvents specification.

To use webhooks, your application's scopes must include the "Subscribe to events" permission for the relevant product.

### Constituent Events

Subscribe to changes in constituent records and related entities. This includes Address added, Constituent added, Email address added, Online presence added, Phone added, and Prospect added events. Also covers changed and deleted variants for these entities (e.g., constituent address changed, constituent email deleted). Additionally includes events for constituent codes, custom fields, relationships, and solicit codes as they are added, changed, or deleted.

### Gift Events

Subscribe to gift lifecycle events such as gift added, gift changed, and gift deleted. Useful for triggering workflows when donations are received or modified.

### Action Events

Subscribe to events when actions (tasks/interactions) are created, changed, or deleted on constituent records.

### Considerations

- There is a delay between when the event happens and when the webhook delivers the notification. On average, the delay is under 5 minutes.
- Webhook subscriptions are scoped to the application that creates them. Subscriptions created via the SKY API Console belong to the console and will be canceled if it gets disconnected from your Blackbaud environment.
- A webhook secret key is used to validate incoming webhook payloads.
