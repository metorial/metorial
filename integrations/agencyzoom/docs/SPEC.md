The YAML is base64 encoded. I was able to decode and analyze it from the OpenAPI spec. Now I have comprehensive information to write the specification.

# Slates Specification for AgencyZoom

## Overview

AgencyZoom (by Vertafore) is a sales automation and CRM platform for P&C insurance agencies. It provides lead management, customer management, policy tracking, task management, service ticketing, and producer performance analytics. The platform integrates with various Agency Management Systems (AMS) like AMS360, QQCatalyst, and HawkSoft.

## Authentication

AgencyZoom supports two authentication methods:

### 1. Username/Password Login (JWT)

- **Endpoint:** `POST https://api.agencyzoom.com/v1/api/auth/login`
- **Request body:** `{ "username": "<email>", "password": "<password>" }`
- The endpoint returns a JWT token that must be passed as a Bearer token in subsequent requests:
  ```
  Authorization: Bearer <token>
  ```
- The permissions of the API caller match those of the logged-in user. To access all functionalities, use the agency owner's credentials.
- Logout endpoint: `POST /v1/api/auth/logout`

### 2. Vertafore V4 SSO Login

- **Step 1:** Call `POST https://api.agencyzoom.com/v1/api/v4sso/get-auth-params` to obtain an authentication URL. This URL should be fetched fresh before each SSO attempt and not cached.
- **Step 2:** Redirect the user to the returned `authUrl` to complete the SSO flow. After authentication, a callback `code` is returned.
- **Step 3:** Exchange the code via `POST https://api.agencyzoom.com/v1/api/v4sso/sso-login` with `{ "code": "<callback_code>" }` to receive a JWT token.
- The JWT is then used identically as in method 1.

### 3. API Key + API Secret (Zapier Integration)

- AgencyZoom provides an API Key and API Secret accessible from the integrations page within AgencyZoom (under the Zapier section, click "Show API Key").
- These credentials are primarily used for third-party integration platforms like Zapier.

### 4. X-Api-Token (Enterprise/Policy Endpoints)

- Certain enterprise endpoints (e.g., policy creation) require an `X-Api-Token` header instead of or in addition to the Bearer token.

## Features

### Lead Management

- Create, retrieve, update, search, and delete leads (both personal and commercial/business leads).
- Supports pipeline and stage assignments — leads can be moved between pipeline stages and their statuses changed (new, contacted, quoted, won, lost, x-dated).
- Manage lead opportunities (insurance product opportunities tied to a lead) including creating, updating, and deleting opportunities with carrier and product line associations.
- Manage lead quotes — create, update, and delete insurance quotes associated with leads.
- Add notes and manage files attached to leads.
- Move leads to "sold" status with associated policy details (carrier, product line, premium, items, effective/expiry dates).
- Supports custom fields on leads.
- Leads can be tagged and filtered by producer, status, workflow stage, lead source, date ranges, and more.

### Customer Management

- Create, retrieve, update, search, and delete customers (both personal and commercial).
- Manage customer policies — retrieve, create, update, delete policies, and retrieve AMS-synced policies.
- Add notes to customer records.
- Retrieve customer tasks.
- Manage customer files (delete files).
- Update customer tags, custom fields, and contact information.
- Supports commercial customer fields like FEIN, business entity, classification, employee count, annual revenue, and payroll.

### Policy Management

- Create and update insurance policies with details including carrier, product line, premium, items, effective/expiry dates, agent, CSR, and location.
- Update policy status (active, cancelled, renewed, reinstated, rewritten).
- Update tags on policies.
- Create endorsements for policies with premium change amounts.
- Policies can be associated with standard carrier codes and standard product line codes for cross-system compatibility.

### Task Management

- Create, retrieve, update, search, delete, complete, and reopen tasks.
- Tasks can be of types: to-do, email, call, or meeting.
- Tasks can be linked to leads or customers and assigned to specific agents.
- Supports duration, due date/time, invitees, and notes.
- Tasks can be filtered by date range, status (open/completed), assignee, type, and period.

### Opportunity Management

- Create, retrieve, update, and delete standalone opportunities.
- Manage drivers associated with opportunities (create, update, delete, link/unlink) with details like name, birthday, gender, marital status, license number.
- Manage vehicles associated with opportunities (create, update, delete, link/unlink) with details like VIN, make, model, year, ownership type.
- Supports property addresses on opportunities.

### Service Center (Service Tickets)

- Create, update, search, and complete service tickets.
- Service tickets are linked to customers and assigned to CSRs.
- Support for pipeline/stage workflows, categories, priorities, and resolutions.
- Filter by status, category, priority, resolution, date ranges, carrier, and policy type.

### Contact Management

- Batch create contacts (up to 5 per call) associated with customers, including name, email, phone, address, and birthday.

### Email and SMS Thread Management

- Search, view details, mark as unread, and delete email threads and SMS threads.
- View individual messages within threads.
- Retrieve producer list for text conversations.

### Life and Health Lead Management

- Search and manage life and health insurance leads with specific filters like EFS professional, appointment dates, and statuses (new, sold, cancelled, no deal, follow up, etc.).

### Configuration and Settings

- Retrieve reference data: product categories, product lines (policy types), carriers, employees, lead sources, lead source categories, locations, loss reasons, custom field definitions, service categories, service priorities, service resolutions, assign groups, CSRs, and life professionals.
- Retrieve pipelines and stages (for both lead and service workflows).
- Retrieve department and group organizational structures.
- Retrieve business classifications with search capability.
- Retrieve recycle events for leads.

### User Profile Management

- Update the authenticated user's profile (first name, last name, email, phone).

## Events

The provider does not support outbound webhooks or event subscriptions through its API for external consumers. AgencyZoom does accept inbound webhooks from lead vendors to receive leads in real-time, but it does not provide a mechanism for external systems to subscribe to events or receive webhook notifications when data changes in AgencyZoom.

For Zapier-based integrations, AgencyZoom provides triggers (new lead added, service request status changed) via the Zapier platform, but these are polling-based mechanisms specific to Zapier and not general-purpose webhook/event subscriptions available through the API.
