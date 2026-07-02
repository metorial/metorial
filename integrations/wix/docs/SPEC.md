Now let me get the full list of Wix API feature areas and webhook event categories.Now I have a comprehensive view. Let me compile the specification.

# Slates Specification for Wix

## Overview

Wix is a cloud-based website building and hosting platform that also provides business management solutions including eCommerce, bookings, events, blog, CRM, and more. Its APIs allow programmatic access to site data, business solutions, and content management across Wix-hosted sites and headless projects.

## Authentication

Wix supports two primary authentication methods:

### 1. API Key Authentication

Account owners and co-owners can create API keys to give developers access to make authenticated API calls at the account or site level. To make a call, developers need both an API key and the relevant account or site ID.

- **API Key**: Generated in the Wix API Keys Manager. You can assign a set of permissions that determine the types of APIs each key can access.
- **Site ID or Account ID**: Include the key in the `Authorization` header. You must also include one of the following headers: `wix-account-id` (required for account-level API calls) or `wix-site-id` (required for site-level API calls).
- API calls require either the `wix-account-id` header or the `wix-site-id` header, but not both. Most APIs are site-level, while account-level APIs are specified as such in the reference documentation.
- Only account owners and co-owners can create API keys.

### 2. OAuth (Client Credentials) — For Wix Apps

OAuth authentication follows the OAuth Client Credentials protocol. This method is used by third-party Wix apps.

- **Credentials required**: App ID and App Secret (found on the OAuth page of the app's dashboard; keep the secret confidential), plus the App Instance ID — the unique identifier for the app on a specific site.
- **Token creation**: Send a request to the Create Access Token endpoint, including your app ID, app secret, and instanceId. Store the returned access_token (valid for 4 hours) and include it in the Authorization header for API requests.
- Permissions (scopes) are declared in the app's dashboard when building the app. Site owners must grant your app explicit permission to access their data when they install your app on their site.

**Note:** Wix offers API keys for authentication, but they aren't available for use in third-party Wix apps. API keys are intended for headless projects and direct account/site administration.

## Features

### eCommerce

Manage online stores including product catalogs, inventory, carts, checkouts, orders, and fulfillment. The eCommerce platform serves as a foundational layer for Wix's own business solutions such as Stores, Bookings, Restaurants Orders, and Table Reservations, and can also be integrated with external business solutions. Supports managing discounts, coupons, gift cards, and pricing plans.

### Stores (Product Catalog)

Create and manage physical and digital products, collections, and product variants. Includes product media, options, and inventory management.

### Bookings

Manage services (appointments, classes, courses), schedules, booking calendars, availability, and staff. Includes waitlist functionality for fully-booked sessions.

### Events

Create and manage events, RSVP and ticketing, guest lists, event categories, and event scheduling.

### Blog

Manage blog posts, categories, tags, and drafts. Query post statistics and manage content in multiple languages.

### Forum

Manage forum categories and posts. Posts can be pinned, moved between categories, liked, and moderated.

### CRM — Members & Contacts

Manage site contacts and members, including creation, querying, and updating contact information. Manage member authentication and roles. Includes communication tools for messaging.

### Loyalty Program

Create and manage loyalty programs, points accrual rules, and member reward balances.

### Forms

Access and manage form submissions collected through Wix Forms.

### Pricing Plans

Create and manage subscription-based pricing plans and member plan assignments.

### Restaurants

Manage restaurant menus, orders, and table reservations.

### Portfolio

Manage portfolio projects and collections.

### CMS (Data)

Work with data stored in Wix content management databases. Create, read, update, and delete data collection items.

### Media

Upload and manage media files (images, videos, audio) in the site's media library.

### Marketing

Manage marketing tools including email campaigns and SEO settings.

### Automations

Configure and manage automated workflows triggered by site events.

### Site Properties & Management

Access and manage site metadata, business information, locations, URLs, multilingual settings, and notification preferences.

### Analytics

Access site analytics data for tracking visitor behavior and business performance.

### Payments

Manage payment providers and transactions through the Payments API.

### Notifications

Send and manage notifications to site owners and members.

### Account-Level Management

Manage sites within an account, domains, team members, and reseller operations. These are account-level APIs requiring an account ID.

## Events

Webhooks are triggered by real-time events relevant to your app and the sites where your app is installed, enabling your app to execute code directly in response to events. Webhook events cover site operations like product creation and purchases, along with app-related actions such as installation or plan upgrades.

Webhooks are configured in the app's dashboard by specifying a callback URL and selecting event types. When you subscribe to a webhook, you specify the endpoint where Wix should send webhook data. When the event occurs, Wix sends a POST request to your handler containing event data.

### eCommerce Events

Cart created/updated, checkout created/completed, order created/updated/approved/canceled/fulfilled. Covers the full purchase lifecycle.

### Stores / Catalog Events

Product created/updated/deleted, collection created/updated/deleted, inventory updated.

### Bookings Events

Booking created/updated/canceled, service created/updated/deleted, schedule and session changes.

### Blog Events

Post created/updated/deleted/published, category created/updated/deleted, tag created/deleted.

### Forum Events

Post created/updated/deleted/pinned/unpinned/closed/opened/reported, category created/updated/deleted.

### CRM / Contacts & Members Events

Contact created/updated/deleted, member created/updated/deleted, member login events.

### Events (Wix Events) Events

Event created/updated/deleted, RSVP created/updated, guest check-in, ticket order events.

### Pricing Plans Events

Plan created/updated, order created/updated/canceled.

### Forms Events

Form submission created.

### App Lifecycle Events

App installed/removed, app instance changed, plan upgraded/downgraded. Includes the app instance ID in payloads for site identification.

### Payments Events

Payment and refund status changes.

### Site Events

Site published, site transferred, and other site-level changes.
