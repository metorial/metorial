There are multiple products called "Datascope." Based on the search results, the most likely candidate for a general integration platform is **DataScope Forms** (datascope.io / mydatascope.com) — a mobile forms and data collection platform. Let me get more details on its API.# Slates Specification for Datascope

## Overview

DataScope (mydatascope.com) is a mobile forms and data collection platform that allows organizations to create digital checklists, work orders, and forms for field operations. It enables users to gather data via a mobile app (including offline), view and manage submissions through a web dashboard, and integrate collected data with external platforms.

## Authentication

DataScope uses API keys to allow access to the API. To obtain an API key, log in to your DataScope account, navigate to the Integrations section, look for the "API Key" option, and copy the generated key.

The API key must be included in all requests via the `Authorization` header:

```
Authorization: <your_api_key>
```

Alternatively, for some endpoints (e.g., when integrating with Power BI), the API key can be passed as a `token` query parameter.

There is no OAuth2 flow; only API key authentication is supported.

## Features

### Form Answer Retrieval

Retrieve submitted form answers (responses) from the platform. Results can be filtered by form ID, user ID, date range, and location. Answers include GPS location data showing where each form was completed. Two retrieval modes are available: a simplified flat format and a detailed format with full question metadata (question types, section labels, subform indices, and linked list/metadata references).

### Answer Modification

Update individual question values in an existing form submission by specifying the form name/ID, form response code, question name, and new value. Supports targeting questions inside repeatable subforms via a subform index parameter.

### Location Management

Create, read, and update locations used within forms. Locations include properties such as name, address, GPS coordinates, company code, phone, and email. Locations serve as metadata that can be referenced in form questions and task assignments.

### List (Metadata) Management

Create and manage custom lists (e.g., products, equipment) that can be referenced in forms. Each list element has a name, description, code, and two custom attributes. Lists can be of type "standard", "percent", or "price". A bulk update operation is available that replaces all elements in a list at once. The bulk update endpoint does not apply to locations — those must be managed via the dedicated locations API.

### Task Assignment

Assign forms to specific users at scheduled dates and locations. Assignments include a form, a user (identified by email), a date/time, a location (by code), optional instructions, and a time window (gap in hours) to complete the task. New locations can be created or updated inline during task assignment.

### Notifications

Retrieve a list of recent notifications (generated PDF or Excel reports) within a date range. Each notification includes the file URL, form name, user, and creation date.

### Generated Files

Retrieve recently generated files (PDF or Excel exports of form submissions) within a date range, similar to notifications.

## Events

### Webhooks — Form Submissions

Webhooks are configured in the Integrations section of the DataScope web platform, where you select a form and a URL endpoint to receive data on every form submission. When a form is submitted, DataScope sends an HTTP POST request with JSON payload containing the form name, form code, GPS coordinates, and all question/answer data (including question name, section label, value, type, and internal ID).

- Webhooks can be scoped to a specific form.
- Webhooks only send information for new form submissions created after the webhook is configured.
- Each webhook targets a single URL endpoint.
