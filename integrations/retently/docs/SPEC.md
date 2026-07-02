Now let me search for more details on Retently's webhook event types:Now I have enough information to compile the specification. Let me also check the Retently help article on webhooks for more detail on outgoing webhook event types:Now I have comprehensive information. Let me compose the specification.

# Slates Specification for Retently

## Overview

Retently is a customer experience management platform that enables businesses to measure customer satisfaction through NPS (Net Promoter Score), CSAT (Customer Satisfaction), CES (Customer Effort Score), and 5-Star surveys. It provides tools for collecting feedback via email, in-app, and link-based surveys, along with analytics, reporting, and customer management capabilities.

## Authentication

Retently supports two authentication methods:

### 1. API Key

Retently supports authentication by API Token. API keys can be created at `https://app.retently.com/settings/api/tokens`.

API keys can be passed in three ways (in order of recommendation):

- **X-Api-Key Header (recommended):** Set the `X-Api-Key` header to your API key.
- **Authorization Header (legacy):** Set the `Authorization` header to `api_key=YOUR_KEY`.
- **Query Parameter (not recommended):** Append `?api_key=YOUR_KEY` to the request URL. This is less secure as keys may be logged.

API keys have two permission levels:

- **Read:** Read-only access (GET requests only). Suitable for dashboards and reporting.
- **Write:** Full access to read and modify data (GET, POST, DELETE). Required for creating customers, sending surveys, and updating records.

### 2. OAuth 2.0

Authentication for your integration starts with login on your Retently account. You'll use the Client ID and Client Secret to initiate the OAuth handshake between Retently and your integration.

OAuth credentials (Client ID and Client Secret) are found at `https://app.retently.com/settings/oauth`.

**Flow:**

1. **Authorization URL:** `https://app.retently.com/api/oauth/authorize`
   - Parameters: `client_id`, `redirect_uri`, `response_type=code`
   - The user grants access and is redirected back with a `code` parameter.

2. **Token Exchange:** `POST https://app.retently.com/api/oauth/token`
   - Content-Type: `application/x-www-form-urlencoded`
   - Parameters: `grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, `code`
   - Returns `access_token`, `refresh_token`, and `expires_in` (21600 seconds / 6 hours).

3. **Token Refresh:** `POST https://app.retently.com/api/oauth/token`
   - Parameters: `grant_type=refresh_token`, `client_id`, `client_secret`, `redirect_uri`, `refresh_token`
   - Access tokens expire after 6 hours, so you can use the refresh token to get a new access token when the first access token expires.

The redirect URI is not predefined in Retently — any URL can be used. Client credentials must be sent in the request body (not as Basic Auth).

## Features

### Customer Management

Create, update, retrieve, and delete customers. Customers are identified by email address. You can assign custom properties (string, date, integer, collection, boolean types), tags, and company information to customers. If your request includes customers that were previously added to Retently, then their data will be updated with the information you will pass in the current request. Bulk operations support up to 1,000 customers per request.

### Company Management

Retrieve company information including industry, tags, NPS/CSAT/CES metrics, and customer counts. Companies can be looked up by ID or domain name.

### Survey Delivery

Send transactional surveys (NPS, CSAT, CES, 5-Star) to customers via a specified campaign. An optional delay parameter allows sending the survey at a later day from the triggered event. The delay is counted in days. Surveys can be sent to up to 100 customers per request. Supports email and in-app survey channels.

### Feedback Retrieval

Retrieve survey responses with filtering by customer email/ID, campaign, date range, and custom customer attributes. Responses include score, text feedback, sentiment, and associated topics/tags. Individual responses can be fetched by ID.

### Feedback Annotation

Add topics (with sentiment: positive, negative, or neutral) and tags to survey responses. Topics and tags can either replace existing ones or be appended to them.

### Campaign & Template Management

Retrieve a list of survey campaigns with details such as metric type (NPS, CSAT, CES, 5-Star), channel (email, link, in-app, Intercom), campaign type (transactional, recurring), and active status. Retrieve available survey templates.

### Score Retrieval

Get the latest score for a specific survey metric (NPS, CSAT, CES, or STAR) across your account, including rating distribution and response counts.

### Reporting

Retrieve campaign reports with trend data, delivery statistics, and additional rating question stats. Reports can be filtered by campaign ID and date range.

### Trends

Retrieve trend groups and detailed trend data within a group, including current vs. baseline scores, trend lines, and respondent distributions. Supports various date range presets and custom date ranges.

### Survey Outbox

Retrieve a list of sent surveys with delivery status, recipient details, and filtering by campaign, channel, date range, and how the survey was sent (campaign, reminder, manual, test, imported).

### Suppression Management

Manage suppression lists to block specific email addresses or domain patterns from receiving surveys. Supports wildcard domain patterns (e.g., `*.example.com`) and categorization (corporate, disposable, invalid).

### Customer Unsubscription

Unsubscribe customers from receiving future surveys, optionally including a custom opt-out message.

## Events

Retently supports webhooks that allow you to send HTTP requests to another web application every time an event is triggered, be it new feedback, a bounced survey, or an unsubscribed contact. Webhooks are configured within the Retently dashboard (not via API).

Based on available documentation, the following event types are supported:

### New Survey Response

Triggers when a new survey response is received. Includes the customer's score, text feedback, and associated metadata.

### Campaign Score Updated

Triggers when the survey campaign's score (NPS, CSAT, CES) is updated.

### Company Score Updated

Triggers when a company's score (NPS, CSAT, CES) is updated.

### Overall Metric Score Updated

Triggers when the score is updated for a particular metric (NPS, CSAT, CES).

### Customer Unsubscribed

Triggers when a customer opts out of surveys.

### Bounced Survey

Triggers when a survey email bounces (delivery failure).
