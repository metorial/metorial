Let me get the raw content from the GitHub repository to see the full sections and webhook details.Now let me get the webhook event types list specifically:Based on the webhook examples in the search results showing events like `project.update`, `booking.update`, `booking.delete.multiple`, and the documentation mentioning supported event tables, let me look for more specific webhook event types.Now I have enough information. The webhook events table content was truncated in the search results (showing "..."), but from the sample webhook payloads I can identify the event types: `project.update`, `booking.create`, `booking.update`, `booking.delete`, `booking.delete.multiple`. Based on the documentation stating you can subscribe to events and the examples showing project and booking events, let me compile the specification.

# Slates Specification for Hub Planner

## Overview

Hub Planner is a cloud-based Resource Management platform that provides programmatic access to Resource Management and Timesheets. It is a resource management and scheduling solution primarily for team-based business workforces, of any scale or industry, covering project planning, resource scheduling, bookings, timesheets, and reporting.

## Authentication

Hub Planner API is authenticated with a OAuth 2.0 Bearer Token. You must supply an Authorization header with the token for all requests, where the value is your generated API key. Do not provide the `Bearer` keyword before the API key in the header.

The header should be set as:

```
Authorization: <your_api_key>
```

**Base URL:** `https://api.hubplanner.com/v1`

**Generating an API Key:**

You must enable API access and generate your API key in order to use the Hub Planner API. The API key is available in all accounts with Administrator privileges and higher. To generate a key:

1. Log in to your Hub Planner account.
2. In the top right corner of the page, click Settings. In the left navigation pane, under Integrations, click Hub Planner API. On the Hub Planner API page, click Enable API. Under the API Key Generator section, click Generate Key.

You can generate keys for different rights and enable access. There are 2 types of API keys you can generate: one with full read/write access and one with read-only access. Select a Role and then generate a key to use in your application.

The API keys you generate in Hub Planner do not expire.

Hub Planner has an open REST API option for all users. All users can access it — whether you have the Plug & Play subscription or the Premium or Enterprise subscription, everyone has full access.

## Features

### Project Management

Create, read, update, and delete projects. Projects include properties such as name, start/end dates, work days, project codes, budget settings, and custom fields. You can search and filter projects using various parameters. Projects can be organized into groups (e.g., Active, Archived, Planned, Pending, Floating).

### Resource Management

Manage resources (team members) including their profiles, skills, locations, and availability. Resources can be tagged and organized into groups. Search and filter resources by various criteria.

### Bookings (Resource Scheduling)

Create bookings for resources on projects with start/end dates. Minimum required fields are resource ID, project ID, start date, and end date. Bookings support multiple state types including percentage-based and minute-based allocation. Booking requests can be created with a type of `WAITING_FOR_APPROVAL` (requires the resource request extension). Bookings can be configured to repeat on weekly, monthly, or yearly intervals. Bulk deletion of bookings is supported by booking IDs, project ID, or resource ID.

- Booking categories can be managed to classify different types of bookings.

### Timesheets

Manage time entries for resources against projects. Timesheets allow tracking actual time worked versus scheduled/forecasted time.

- Requires the Timesheets extension to be enabled on the account.

### Events

Create and manage events (a special type of schedulable item, similar to projects but for non-project activities). Events support CRUD operations and search functionality.

### Milestones

Create, read, update, and delete milestones associated with projects. Milestones can be searched by specific parameters.

### Vacation Management

Manage vacation and time-off records for resources.

### Public Holidays

Manage public holidays and public holiday calendar groups. Search holidays within date ranges.

### Clients

Manage client records that can be associated with projects.

### Billing Rates

Configure billing rates for projects, resources, and bookings. Supports both internal and external rates.

- Requires the Premium Extension.

### Project Managers

Assign and manage project managers for projects.

### Unassigned Work

Manage unassigned work items that haven't yet been allocated to specific resources.

- Requires the Unassigned Work extension.

### Tags

Manage project tags and resource tags for categorization and filtering.

### Custom Fields

The API provides access to Custom Fields, allowing you to manage custom data fields on projects and resources.

### Project Cost Categories

Manage cost categories associated with projects for budget tracking purposes.

### Search

Most areas support advanced search using filter parameters such as `$in` (included) and `$nin` (not included) operators, allowing flexible querying across all major entities.

## Events

Hub Planner supports webhooks to tap into real-time events triggered in the application and use those events in third-party software. For example, when a new project is created, you can create that project in another service.

To use the webhooks functionality you first need to subscribe to the chosen event by providing an event name, a target URL, and an optional authorization token. The `authorization_token` is sent with the webhook request as the `hubplanner-token` HTTP header.

### Project Events

Notifications when projects are created or updated. Webhook payloads include project details such as resource IDs, project manager IDs, start/end dates, and work day configuration.

- Event: `project.create`
- Event: `project.update`

### Booking Events

Notifications when bookings are created, updated, or deleted. Payloads include booking ID, resource and project details, start/end dates, category, and duration information.

- Event: `booking.create`
- Event: `booking.update`
- Event: `booking.delete`
- Event: `booking.delete.multiple` — triggered when multiple bookings are deleted at once; the payload contains an array of deleted booking details.

**Note:** The exact full list of supported webhook events may include additional event types beyond those documented with sample payloads. Refer to the [Hub Planner API webhook documentation](https://github.com/hubplanner/API/blob/master/Sections/webhooks.md) for the current supported events table.
