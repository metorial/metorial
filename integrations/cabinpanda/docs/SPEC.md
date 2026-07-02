# Slates Specification for Cabinpanda

## Overview

CabinPanda is a data collection platform that enables users to create and manage online forms (standard, conversational, pop-up, scheduling, and backendless forms), collect submissions, and analyze form performance. It supports integrations with 2,200+ apps and offers features like form analytics and session recording.

## Authentication

CabinPanda uses **API Key (Bearer Token)** authentication.

- **Method:** Bearer token in the `Authorization` header.
- **Header format:** `Authorization: Bearer <API_TOKEN>`
- **Base URL:** `https://api.cabinpanda.com/api/v1/`
- **Accept header:** `application/json`

To obtain an API token, log in to your CabinPanda account and generate an API token from the account settings. The token is then passed as a Bearer token with each API request.

**Example request:**

```
GET https://api.cabinpanda.com/api/v1/profile
Headers:
  Authorization: Bearer your_api_token_here
  Accept: application/json
```

## Features

### Profile Management

- Retrieve the authenticated user's profile information.
- Useful for verifying API connectivity and retrieving account details.

### Form Management

- Create, update, delete, and retrieve forms programmatically.
- List all forms associated with the account or get details of a specific form by ID.
- Forms can include various field types (30+ available) and support multiple form styles including standard, conversational, pop-up, and scheduling forms.

### Submission Management

- Retrieve and review all submissions for a specific form.
- Enables processing, filtering, or exporting of collected form response data.

### Integration Management

- List, inspect, and delete integrations (e.g., webhook connections) configured on forms.
- Integrations connect form submissions to external services and apps.
- Integrations can be removed by ID when no longer needed.

### User Management

- Retrieve a list of all users associated with the account.
- Useful for managing team access and understanding account membership.

## Events

The provider does not appear to support native webhooks or event subscription mechanisms through its API. CabinPanda does support outbound webhook integrations (sending form data to external URLs upon submission), but this is configured through the platform's integration settings rather than through a dedicated webhook subscription API. Third-party platforms like Zapier offer a "New Submission" trigger for CabinPanda, but this is facilitated through those platforms rather than a native CabinPanda event system.
