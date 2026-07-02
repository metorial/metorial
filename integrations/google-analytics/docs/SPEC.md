# Slates Specification for Google Analytics

## Overview

Google Analytics 4 (GA4) is Google's web and app analytics platform that tracks user interactions, measures traffic, and provides reporting on engagement metrics across websites and applications. It provides the Measurement Protocol API for sending data to GA4 and the Google Analytics Data API for retrieving data from GA4. An Admin API allows for programmatic management of accounts, properties, data streams, and integrations with other Google services.

## Configuration

- `propertyId` is optional. When configured, property-scoped Data API and Admin API tools use it as the default GA4 property ID if the tool input omits `propertyId`. When it is not configured, callers should use `list_accounts_and_properties` to discover a property and pass its ID manually.
- `measurementId` is optional. When configured, Measurement Protocol tools use it as the default web stream Measurement ID if the tool input omits `measurementId`. `apiSecret` is not a config value and must come from tool input or Measurement Protocol auth.

## Authentication

Google Analytics supports two authentication methods:

### OAuth 2.0 (User Authentication)

Google APIs use the OAuth 2.0 protocol for authentication and authorization. This is the primary method for accessing user data on their behalf.

- **Authorization endpoint:** `https://accounts.google.com/o/oauth2/v2/auth`
- **Token endpoint:** `https://accounts.google.com/o/oauth2/token`
- **Required credentials:** Client ID and Client Secret, obtained by registering your application in the Google API Console.
- The Google Authorization Server sends your application an access token (or an authorization code that your application can use to obtain an access token).
- Setting `access_type: 'offline'` ensures that a refresh token is returned, enabling long-lived access.

**OAuth Scopes:**

- `https://www.googleapis.com/auth/analytics.readonly` — Read-only access to Google Analytics data and configuration.
- `https://www.googleapis.com/auth/analytics.edit` — Edit access to Google Analytics configuration (also grants read access).
- `https://www.googleapis.com/auth/analytics.manage.users` — Manage user permissions on Analytics accounts and properties.
- `https://www.googleapis.com/auth/analytics.manage.users.readonly` — View user permissions on Analytics accounts and properties.

Authorization for using the API methods primarily requires the `analytics.readonly` or `analytics.edit` OAuth scopes.

### Service Account Authentication

Service accounts are mostly used when you want to manage your own accounts. This method is suitable for server-to-server communication without user interaction.

- Create a service account in the Google Cloud Console and download a JSON key file containing the private key and service account email.
- The client library uses a service account key file (JSON) referenced in the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to automatically handle the OAuth 2.0 process.
- Add the service account email (e.g., `name@project.iam.gserviceaccount.com`) as a user in the Google Analytics property and grant it the appropriate role.

### Measurement Protocol Authentication

For sending data to GA4 via the Measurement Protocol, a different authentication mechanism is used:

- Data is sent to Google Analytics via HTTP POST requests to `https://www.google-analytics.com/mp/collect`. The request requires an `api_secret` query parameter and a JSON body.
- The API secret key is data stream specific, so it cannot be used across data streams or properties.
- The `measurement_id` (for web streams) or `firebase_app_id` (for app streams) is also required as a query parameter.
- OAuth connections can use configured `measurementId`, or discover web stream `measurementId` values through data stream listing and pass `measurementId` plus `apiSecret` directly to event tools. Measurement Protocol Only auth can still store these stream-specific credentials as a fallback.

## Features

### Reporting and Data Retrieval (Data API)

The Data API allows you to report on various user and page view metrics for apps and websites, and to build custom dashboards, automate reporting, and integrate data with other business applications.

- Query reports with configurable dimensions (e.g., date, city, country, page path) and metrics (e.g., active users, sessions, page views, conversions).
- Supports date ranges (up to 4 simultaneously), dimension/metric filters, sorting, and pivoting.
- Funnel reports let you visualize the steps your users take to complete a task and see how well they are succeeding or failing at each step.
- Metadata endpoint for exploring the dimensions and metrics available in reporting.
- Supports real-time reporting to view current activity on your property.
- No sampling; ability to create custom metrics and dimensions.

### Property and Account Administration (Admin API)

Key actions include provisioning and managing accounts, properties, and subproperties. It enables management of data sharing, retention, and Google Signals settings. The API facilitates managing data streams, measurement protocol secrets, and various event-related features. It also supports linking with Firebase, Google Ads, Display & Video 360, Search Ads 360, and BigQuery.

- Create, update, and delete custom dimensions and custom metrics.
- Manage user permissions for an account hierarchy and Google Analytics properties.
- Generate data access reports to audit who accessed your analytics data.
- Manage audiences.
- Search change history events within Google Analytics accounts and properties.
- Manage key events (conversions) and event create/edit rules.
- Manage measurement protocol secrets for data streams.

### Sending Event Data (Measurement Protocol)

The Measurement Protocol allows sending events directly to Google Analytics servers via HTTP requests to record server-to-server and offline interactions.

- Use cases include tying online to offline behavior, measuring server-side interactions, sending offline conversions, and sending events from devices like kiosks and watches.
- The events array can contain up to 25 event items per request, each with a name and optional parameters.
- The Measurement Protocol is intended to supplement, not replace, automatic data collection methods (gtag, Tag Manager, Firebase).
- Supports providing user ID, geographic information, device information, and consent settings with events.
- Historical data retrieval is limited, and some reports may only provide data within the GA4 property creation date.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms. Google Analytics 4 does not offer outbound webhooks or push-based notifications for changes to analytics data or configuration. Any event-driven workflows would need to rely on polling the Data API or Admin API for changes.
