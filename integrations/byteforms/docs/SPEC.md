Now let me look at the actual ByteForms API documentation and check for webhook support:Let me try to access the ByteForms API documentation directly:Now I have sufficient information to write the specification. Let me compile what I've found:

# Slates Specification for Byteforms

## Overview

ByteForms is a form builder platform by BytePlexure (part of the ByteSuite product family) that allows users to create forms, surveys, and quizzes. It provides form creation, submission management, and data integration. It supports payment collection, calendar appointment booking, and integrations with third-party services.

## Authentication

ByteForms uses API keys for authentication. The API key is passed in the `Authorization` header of each request.

- **Base URL:** `https://api.forms.bytesuite.io/api`
- **Header:** `Authorization: <api_key>`

The API key can be obtained from your ByteForms account settings. No OAuth flow or additional scopes are required.

**Example request:**

```
GET https://api.forms.bytesuite.io/api/form
Authorization: YOUR_API_KEY
```

## Features

### Form Management

Retrieve a list of forms associated with your account. This allows you to programmatically access form metadata and configuration. You can access ByteForms forms through the programming interface provided by ByteForms.

- Forms can be identified by a unique form ID.

### Submission Management

Access and retrieve form submissions (responses) for a specific form. All form submissions are stored in the ByteForms Inbox, where you can view submissions, access daily analytics reports, and export data to CSV or JSON formats.

- Submissions can be listed per form using the form ID.
- Submissions include a `created_at` timestamp and unique ID.
- Results are returned in a cursor-based paginated format.

### Third-Party Integrations

ByteForms can send form submission data as messages to Slack channels. Forms can be connected with dozens of popular third-party services to ensure data is delivered to the right destinations.

### Payment Collection

ByteForms supports collecting payments online through forms. This feature may have limited availability as some payment features are marked as coming soon.

### Calendar Booking

Users can manage calendar appointments and bookings directly through their forms.

## Events

The provider does not support native webhooks or purpose-built event subscription mechanisms through its API. Third-party platforms like Zapier trigger when a new form submission is received, but this is implemented via polling for new submissions rather than native webhooks. Similarly, Pipedream emits new events when a user submission to a form occurs, using a polling-based mechanism that checks for new submissions at regular intervals based on the `created_at` timestamp.
