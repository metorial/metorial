There seem to be multiple products called "Timelink." Based on the Zapier/Pipedream integrations referencing `api.timelink.io`, this appears to be the time tracking tool at timelink.io. Let me get more details about their API.Now let me check the timelink.io website for more details on their API.Now I have enough information to write the specification. Let me compile what I've found:

- Timelink (timelink.io) is a time tracking tool with a physical touch display panel
- API base URL: `https://api.timelink.io/api/v1/`
- Authentication: Bearer token (API token)
- Resources: Users, Clients, Projects, Services, Time Entries
- Zapier triggers are marked as "Instant" (webhooks): New Time Entry, Updated Time Entry, Deleted Time Entry
- Actions: CRUD operations on clients, projects, services, time entries

# Slates Specification for Timelink

## Overview

Timelink is a time recording tool that optionally uses a physical touch display as an input device. It is a comprehensive time tracking and management tool designed to help individuals and teams efficiently manage their time and tasks, with features like time logging, project tracking, and detailed reporting. The API is hosted at `https://api.timelink.io/api/v1/`.

## Authentication

Timelink uses **Bearer Token** authentication via an API token.

API requests are authenticated by including an `Authorization: Bearer <api_token>` header, where `<api_token>` is the user's API token obtained from the timelink account settings.

- **Base URL:** `https://api.timelink.io/api/v1/`
- **Header:** `Authorization: Bearer <api_token>`

To authenticate, generate an API token from your timelink account and include it in every API request as a Bearer token in the Authorization header.

## Features

### User Management

Retrieve information about users in the timelink workspace. Users represent team members who record time entries.

### Client Management

Manage clients by listing all clients, creating new clients, retrieving details of a specific client, and updating client details. Clients can be configured with properties including name, information/description, color, acronym, active status, billable flag, and an external ID for syncing with other systems.

### Project Management

Create and manage projects associated with clients. Projects support properties including name, info, color, acronym, active status, billable flag, client assignment, and an external ID. Projects can be searched by name and can be linked to a specific client.

### Service Management

Create and manage services (activity types) that can be associated with time entries. Services have properties including name, information, color, acronym, active status, and an external ID.

### Time Entry Management

Create, update, search, and manage time entries. Time entries represent tracked work periods and include:

- **Required fields:** Start time, end time
- **Optional fields:** Client ID, project ID, service ID, description, user ID, paid status, billable flag, external ID
- Time entries can be searched/filtered by date range (after/before), client, project, service, and external ID.

## Events

Timelink supports webhooks for real-time notifications on time entry changes. The available webhook triggers fire instantly when time entry events occur:

### Time Entry Created

Triggers instantly when a new time entry is created in timelink.

### Time Entry Updated

Triggers instantly when an existing time entry is updated in timelink.

### Time Entry Deleted

Triggers instantly when a time entry is deleted from timelink.
