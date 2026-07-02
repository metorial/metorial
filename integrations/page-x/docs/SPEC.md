I see from the Pipedream results that PAGE X appears to be a CRM platform accessible via RapidAPI. Let me research more about it.Now let me check the PageX CRM website for more details about features.Now I have enough information to write the specification. Based on my research:

- **Page X (PageXCRM)** is a CRM tool for lead management
- The API is hosted via RapidAPI at `pagexcrm.p.rapidapi.com`
- Authentication uses two keys: a PageX API key and a RapidAPI key
- The API appears to be very simple — primarily focused on sending/creating leads
- The only documented action is creating a new lead with fields like customer_id, name, email, phone, platform, country
- No webhooks or event support found

# Slates Specification for Page X

## Overview

Page X (PageXCRM) is a CRM platform focused on capturing and managing leads from websites and external systems to streamline sales processes. It offers sales automation, lead tracking, analytics, and client communication features. The API is hosted through RapidAPI and is primarily oriented toward lead ingestion.

## Authentication

Page X uses a dual API key authentication model, as the API is accessed through RapidAPI's infrastructure.

Two credentials are required:

1. **Page X API Key** (`api_key`): Obtained from your PageXCRM account. This key is sent as part of the request body (form data) to identify your Page X account/customer.
2. **RapidAPI Key** (`x-rapidapi-key`): Obtained by subscribing to the PageXCRM API on [RapidAPI](https://rapidapi.com/thunderhurt/api/pagexcrm). This key is sent as a request header.

Additionally, the following header must be included in all requests:

- `x-rapidapi-host`: `pagexcrm.p.rapidapi.com`

**Example request headers:**

```
x-rapidapi-key: <your-rapidapi-key>
x-rapidapi-host: pagexcrm.p.rapidapi.com
Content-Type: multipart/form-data
```

The Page X `api_key` is included as a form field in the request body alongside the lead data.

## Features

### Lead Creation

Submit new leads into the PageXCRM system from external sources such as websites, ad platforms, or other applications. Each lead can include the following fields:

- **Customer ID**: Identifier for the customer/account within PageXCRM.
- **Name**: Full name of the lead.
- **Email**: Email address of the lead.
- **Phone**: Phone number of the lead.
- **Platform**: The source platform the lead originated from (e.g., website name, ad platform).
- **Country**: The lead's country.

This is the primary (and currently the only publicly documented) API capability. The API is designed as a one-way lead ingestion mechanism — it accepts lead data to be stored and managed within the PageXCRM platform.

**Limitations:**

- The API is very limited in scope — it does not expose endpoints for reading, updating, or deleting leads or other CRM data.
- There are no documented endpoints for retrieving contacts, managing pipelines, or accessing analytics via the API.
- All API interactions go through RapidAPI, so a RapidAPI subscription is required.

## Events

The provider does not support events. There are no documented webhooks or event subscription mechanisms available through the Page X API.
