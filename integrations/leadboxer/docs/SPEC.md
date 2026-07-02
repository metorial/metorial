Now let me check the webhooks guide and the authentication details more specifically:Now let me check if there's a webhooks guide:Let me check the Zapier integration to understand what triggers/events LeadBoxer natively supports:Now I have enough information to write the specification. Let me also check the legacy API endpoint structure and the management API for lead assignment:

# Slates Specification for LeadBoxer

## Overview

LeadBoxer is a B2B lead generation and intelligence platform that identifies website visitors, enriches lead data with firmographic information, and scores/qualifies leads for sales teams. LeadBoxer is a Lead Data Platform, to identify, qualify and manage leads. It provides APIs for tracking behavioral events, looking up company data by IP or domain, and retrieving lead/session information.

## Authentication

LeadBoxer uses API key authentication. The API is stateless – all requests are validated against an API key (token).

**API Key via Header (new API):**

Include your API key in the `x-api-key` request header:

```
x-api-key: YOUR_API_KEY
```

**API Key via Query String (legacy API):**

The API key can also be passed as a query string parameter named `apiKey`, e.g., `?apiKey=YOUR_API_KEY`.

**Obtaining Credentials:**

1. Log in to your LeadBoxer account at `https://app.leadboxer.com`
2. Navigate to Integrations > Data to get your API key from `https://app.leadboxer.com/integrations-connectors/data/api-key`.
3. Copy your API Key and note your Dataset ID. If you're managing multiple datasets, ensure you're selecting the correct ID for your intended workflow.

**Required parameters:**

- **API Key**: Used for authentication on all API calls.
- **Dataset ID** (`site`): Identifies which dataset (website/property) to query or send data to. Multiple datasets can be added to one LeadBoxer account. Domains and site sections can be added as separate datasets with different accesses.

## Features

### Lead Retrieval and Management

Retrieve lists of identified leads/visitors with filtering, sorting, and search capabilities. You can retrieve a list of users using the `GET /api/views/c_view_leads` request, and using available parameters and filters you can customize the output to your needs. Leads can be filtered by criteria such as industry, location, engagement level, and time period. Leads can also be assigned to sales team members via the management API.

### Lead Detail and Behavioral Data

LeadBoxer groups received events into sessions and users. A session is made up of a series of events. A user is made up of a series of sessions. A single user can generate multiple sessions. You can retrieve detailed session history and individual events for any lead to build a complete behavioral profile.

### IP Address Lookup (Company Identification)

LeadBoxer's Lookup APIs allow you to enrich your existing data with firmographics, company intelligence, and person-level insights—without using the tracking pixel. Given an IP address, the API returns company domain, company name, industry, employee count, revenue range, location, ISP/type detection, and confidence score.

### Domain/Company Lookup (Data Enrichment)

The Domain Lookup operation transforms a simple domain name into detailed insights about a company, from its size to its technology stack. Given a domain, the API returns company name, employee count, revenue, industry, technologies, location, and more. Useful for enriching CRM records or scoring ICP fit.

### Server-Side Event Tracking

Capture behavioral data from any backend system and send high-quality signals to LeadBoxer. Server-side tracking lets you submit events directly from your backend, application server, automation platform or mobile app. This is ideal for actions that do not occur in a browser. Events are submitted to the ingestion endpoint (`https://log.leadboxer.com/`) with a dataset ID and optional user/session IDs. Any property attached to an event is copied to the user profile, enabling progressive enrichment over time.

- Supports custom properties as name/value pairs on each event.
- Can be used to track sign-ups, logins, subscription changes, CRM activities, and other backend events.
- Requires a dataset ID; optionally accepts user ID (`uid`) and session ID (`sid`) to update existing records.

### Lead Enrichment with Custom Properties

You can set the properties of an event. These properties are automatically passed to the parent objects: users and sessions. After inserting an event with property name/value, the session and user will also have this property name/value. This allows progressive enrichment of lead profiles over time by sending events with additional metadata.

## Events

LeadBoxer does not provide a native webhook subscription API for pushing events to external endpoints. The platform's Zapier integration offers a polling-based trigger that triggers when a new lead has been identified. However, this is a Zapier-specific polling mechanism, not a purpose-built webhook or event subscription system within the LeadBoxer API itself.

The provider does not support events.
