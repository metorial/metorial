There are multiple products named "Breeze." The most prominent one for integration purposes appears to be **Breeze ChMS** (Church Management Software) and **Breeze PM** (Project Management). Let me clarify which "Breeze" is most likely intended. Given the context of a general integration platform, I'll note that "Breeze" most commonly refers to **Breeze ChMS** in the integration/API context. Let me get more details on the full API capabilities.Now I have comprehensive information about Breeze ChMS API. Let me also check if there are webhooks available.Now I have all the information needed. Breeze ChMS does not natively support webhooks — it provides an Account Log API that can be used as a polling mechanism to detect changes. Let me compile the specification.

# Slates Specification for Breeze

## Overview

Breeze (Breeze ChMS) is a church management software platform that serves small and mid-sized churches by providing cloud-based church management software. It includes people, tags, events, check-in, contribution, pledges, forms, volunteers, families, and accounts.

## Authentication

Breeze API supports HTTP Basic auth and token based authentication.

**HTTP Basic Authentication:** You can use HTTP Basic authentication with your login credentials. Example: `curl -u username:password https://yoursubdomain.breezechms.com/api/projects.json`

**API Token Authentication:** You can also authenticate by providing your API token in the request. The token has to be sent for each request your application makes to the Breeze API. The token can be passed as the username in HTTP Basic auth (with an empty password) or as a query parameter:

- `curl -u your_api_token: https://yoursubdomain.breezechms.com/api/people/`
- `curl https://yoursubdomain.breezechms.com/api/people/?api_token=your_api_token`

Account Owners can obtain their API key by going to Manage Account > API Key.

**Required Inputs:**

- **Subdomain**: Your Breeze account subdomain (e.g., `yourchurch` from `yourchurch.breezechms.com`). All API requests are made to `https://yoursubdomain.breezechms.com/api/`.
- **API Key**: The secret API token from your Breeze account settings.

**Multi-team support:** If the user is part of multiple teams/organizations then you must add the team ID to every call. You can append it to every call with `team_id` or add it to the HTTP header `HTTP_X_TEAM_ID`. You can get all the team IDs from the user endpoint.

## Features

### People Management

Create, read, update, and delete person records in the church database. People can be listed with optional filtering by tags, status, and other custom profile fields. Individual person details include contact information, address, birthdate, gender, marital status, school, employer, and custom profile fields. Custom profile fields can be managed and queried to understand the schema of person records.

- Supports filtering people by tags, status, and custom profile field values.
- People can be retrieved with basic info (id and name only) or full details.
- Custom profile fields support various types: text, multiple choice, dropdown, checkbox, date, textarea, birthdate, email, phone, address, and family role.

### Family Management

Link and unlink person records to form family units. Add people to existing families or remove them, and create or destroy family groupings.

- A person can only belong to one family at a time; adding them to a new family removes them from their previous one.
- Destroying a family does not delete the people — it only unlinks their associations.

### Tags and Folders

Organize people using tags grouped into hierarchical folders. Tags can be created, deleted, assigned to people, and unassigned from people. Tag folders provide organizational structure.

- People can be filtered by tags using the People listing feature.
- Folders support parent-child nesting.

### Events and Calendars

Manage church events and calendars. Events can be created, listed, retrieved, and deleted. Calendars (categories) can be listed, and events can be placed on specific calendars. Event locations can also be listed.

- Events can be filtered by date range and calendar/category.
- Events can be part of a series, with support for querying related instances.
- External calendars (e.g., Google Calendar) are available via iCal feed URLs but not directly via the events API.
- Event responses may be cached and lag up to 15 minutes behind the live site.

### Attendance / Check-In

Record and manage attendance for events. Check people in or out of event instances, remove attendance records, list attendance for a given event, and list people eligible for check-in.

- Supports both check-in and check-out (recording departure timestamps).
- Supports both person-based attendance and anonymous head counts.

### Contributions / Giving

Record financial contributions (donations/gifts) from third-party payment processors. Contributions can be added with details including date, amount, fund allocations (including split-fund gifts), payment method, batch grouping, and donor information.

- Supports matching donors by a unique external ID so that subsequent gifts automatically link to the correct profile.
- Fund names are auto-created if they don't already exist.
- Contributions with the same group identifier are placed into the same batch.

### Forms

List forms, retrieve form fields and their structure, list form entries with responses, and remove form entries. Forms can be active or archived.

- Form field definitions can be retrieved to understand the schema of responses.
- Entry responses reference field IDs from the form field definitions.

### Volunteers

Manage volunteer scheduling for events. List, add, remove, and update volunteers for specific event instances. Manage volunteer roles including creating roles with quantity requirements and removing roles.

- Volunteer roles are tied to event series — adding/removing a role on one instance affects all instances in the series.
- Volunteers can be assigned one or more roles, and role assignments replace existing values.

### Account

Retrieve account summary information (name, subdomain, timezone, country) and query the account activity log. The activity log provides a record of actions performed across the system.

- The account log supports filtering by action type, date range, and user.
- Action types span across all major areas: people, events, contributions, tags, forms, volunteers, follow-ups, users, extensions, and account changes.

## Events

Breeze does not support webhooks or real-time event subscriptions. However, it provides a purpose-built **Account Log** polling mechanism that can be used to detect changes across the system.

### Account Log (Polling)

The Account Log API (`/api/account/list_log`) returns a historical record of actions performed in the Breeze account, which can be polled periodically to detect changes.

Supported action categories include:

- **People**: person created, updated, deleted, archived, merged, bulk updates, bulk imports, bulk deletes.
- **Contributions**: contribution added, updated, deleted, bulk imports/deletes, envelope and payment method changes, batch updates, pledge imports.
- **Events**: event created, updated, deleted, calendar changes, attendance imports/deletes.
- **Tags**: tag created, updated, deleted, tag assigned/unassigned, folder changes.
- **Forms**: form created, updated, deleted, form entry updates/deletes.
- **Volunteers**: volunteer role created/deleted.
- **Users**: user created, updated, deleted, role changes.
- **Communications**: text sent.
- **Follow-Ups**: follow-up option created, updated, deleted.
- **Extensions**: extension installed, uninstalled, upgraded, downgraded.
- **Account**: subscription payment method updated.

Parameters:

- `action` (required): The specific action type to query.
- `start` / `end`: Date range filters.
- `user_id`: Filter by the user who performed the action.
- `details`: Include descriptive details about the logged action.
