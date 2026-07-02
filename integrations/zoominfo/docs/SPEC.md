# Slates Specification for ZoomInfo

## Overview

ZoomInfo is a B2B data intelligence platform with a database of over 200 million business contacts and companies. The API allows users to query the ZoomInfo database for relevant companies and contacts and enrich data records in CRM, Marketing Automation, and other systems. It provides in-depth information such as technologies used, company attributes, corporate hierarchies, funding details, news alerts and scoops.

## Authentication

ZoomInfo supports multiple authentication methods depending on the API version being used.

### New API (OAuth 2.0 with PKCE)

The current ZoomInfo API uses OAuth 2.0 Authorization Code flow with PKCE (Proof Key for Code Exchange).

1. **Authorization**: The client application must redirect its users to authenticate through ZoomInfo Login, which uses the Authorization server (Okta) to verify, authenticate, and provide a token. The login URL follows the format: `https://login.zoominfo.com/` with the required query parameters appended.
2. **PKCE**: The PKCE extension secures the Authorization Code flow by having the client generate a random Code Verifier and a hashed Code Challenge at the start of the flow.
3. **Token Exchange**: Generate a Basic Authentication header by Base64-encoding the client ID and secret combination, then build the token exchange request body with the authorization code, grant type, redirect URI, and code verifier. Send the POST request to Okta's token endpoint to receive the access token, ID token, refresh token, and granted scopes.
4. **Token Lifetime**: Access tokens expire after 24 hours in the ZoomInfo Platform. When the access token expires, the application sends the refresh token to the authorization server, which issues a new access token and a new refresh token. The old refresh token is immediately invalidated (token rotation with 30-second grace period).

Scopes can be specified but best practice is to exclude scopes from the login URL; when application access needs to be split across multiple sets of scopes, creating a separate application is recommended.

### Legacy Enterprise API (being deprecated)

The legacy API supports Private Key Infrastructure (PKI) and username/password authentication. For both methods, a JWT is returned.

- **PKI Authentication**: Obtain a Client ID and Private Key pair from the ZoomInfo Admin Portal (Admin Portal > Integrations > API & Webhooks). This method needs a private key and a client ID to generate the JWT token. There is no expiration on the PKI key, but rotation every 90 days is recommended.
- **Username/Password Authentication**: Authenticate using your ZoomInfo username and password by POSTing to `https://api.zoominfo.com/authenticate`.
- Both methods result in a JWT that needs to be refreshed every 60 minutes. The JWT contains the expiration time.

API access and available endpoints depend on subscription tier and entitlements.

## Features

### Contact Search and Enrichment

Search for contacts and companies using criteria like title, company, location, and other filters. Returns record previews for further enrichment. The Enrich API retrieves full ZoomInfo profiles by matching known contacts/accounts, enriching existing data with in-depth sales intelligence. Available data includes direct dials, email addresses, job titles, company firmographics, technographics, and corporate hierarchy.

- Searches are free; each time you enrich a new ZoomInfo record, you expend one credit. Subsequent enrichment of the same record is free for the next twelve months.
- You can customize which output fields are returned in enrichment responses.

### Company Data and Corporate Hierarchy

Query detailed company information including firmographics (size, revenue, industry, locations), technographics (installed technologies), corporate hierarchy and subsidiary relationships, and funding details.

- Location-specific enrichment is available for companies with multiple offices.
- Company Master Data enrichment provides canonical company profiles.

### Intent Data

ZoomInfo Intent data shows which leads or accounts are actively researching topics. Intent Search lets you search for companies and recommended contacts by Intent topics your organization subscribes to. Intent Enrich lets you enrich Intent data for a specific company.

- Intent topics are based on your subscription and must be configured in the ZoomInfo platform before querying via the API.
- Custom topics can be defined with specific keywords aligned to your business.

### Scoops and News

Scoops are actionable intelligence leads that ZoomInfo sources through surveys and their in-house Research Team. ZoomInfo identifies internal projects and leadership moves to help time outreach effectively. News search retrieves recent news-related data about companies.

- Scoops can be filtered by type, topic, department, or keywords.

### WebSights (Website Visitor Identification)

The WebSights API resolves anonymous website traffic to company-level data. When a prospect visits your site, the API returns firmographic details so marketing can trigger account-based plays or alert sales to engaged accounts.

- Resolves both IPv4 and IPv6 addresses.
- Returns company profiles and ISP information along with IP geolocation details.
- Requires separate subscription/entitlement.

### Compliance

The Compliance API helps organizations adhere to data privacy regulations such as GDPR and CCPA. It delivers dedicated endpoints to identify and manage consumer data based on preference and opt-out status at scale.

- Supports programmatic discovery and suppression of opted-out contacts.
- Requires separate subscription/entitlement.

### Bulk/Scaling Operations

For major bulk processing, ZoomInfo offers dedicated Bulk APIs tuned for intense batch jobs. These bypass Standard API thresholds via asynchronous job handling.

- Bulk Search supports up to 200K results per query.
- Bulk Enrich processes large record sets asynchronously.

### Usage Tracking

The API provides endpoints and response headers to monitor credit consumption and request usage, allowing you to track how many credits and API calls have been consumed and how many remain.

## Events

ZoomInfo supports webhooks for receiving real-time updates on previously enriched records.

### Record Update Notifications

The Webhooks endpoints let you receive real-time updates for contact or company records that you have previously enriched, by listening to events you subscribe to and sending updates securely to your application. For example, when a contact you have previously enriched has a job title change in the ZoomInfo database, you can be instantly notified.

- **Object types**: Contact and Company.
- **Event types**: Currently limited to record re-enrichment (attribute changes on previously enriched records).
- **Payload configuration**: You can customize the payload to receive only relevant fields or the full record payload. The response includes a list of changed attributes.
- **Security**: A verification token secures communication between ZoomInfo and your target app. When data is sent to your target URL via POST, the verification token is included in the `x-zoominfo-token` request header.
- You will only receive updates on records that you've purchased using the API within the past 12 months.
- Webhooks can be configured via the API or through the ZoomInfo Admin Portal UI.
- No credits are charged to receive webhook updates on records already under management.
