# Slates Specification for Folk

## Overview

Folk is a lightweight, relationship-focused CRM that manages contacts (people and companies), deals, and pipelines. It captures contacts from email, LinkedIn, and other sources, organizes them into customizable groups with custom fields, and supports email sequences, interaction tracking, notes, and reminders.

## Authentication

Folk uses **API key** authentication. There is no OAuth2 flow.

To authenticate:

1. Go to your Folk workspace **Settings > API** section and create a new API key.
2. Copy and securely store the generated key.
3. Include the API key in the `Authorization` header of every request using the Bearer token scheme: `Authorization: Bearer YOUR_API_KEY`.

The API base URL is `https://api.folk.app/v1`.

There are no scopes or additional credentials (such as tenant IDs) required. The API key is tied to a specific workspace and grants access to all resources within that workspace.

## Features

### People Management

A person is the most basic unit of data in Folk. You can create, read, update, and delete people in your workspace. Each person has native fields including first name, last name, description, birthday, job title, emails, phones, addresses, URLs, and company associations. People can belong to multiple groups and have group-specific custom field values.

### Company Management

A company is a business entity that can include one or more people. You can create, read, update, and delete companies. Companies share a similar structure to people with native fields, group memberships, and custom field values.

### Deal Management

A deal is an object you use to track opportunities, projects, or any other outcome-driven item in Folk. Deals have a name and can reference people and companies. Deals are created inside a group and can only reference people and companies that belong to the same group. Deals also support custom fields defined within their group.

### Groups

Folk uses groups to map out workflows. A group is a database made up of contacts (people and companies) that work as categories to organize different types of contacts for different workflows. You can list groups in a workspace and manage group memberships for people and companies.

### Custom Fields

In each group you can define custom fields, which are custom attributes that can be added to people and companies. Custom fields allow you to tailor data to your specific business needs on a per-group basis.

### Notes

You can create, read, update, and delete notes attached to people or companies. Notes can have visibility settings (e.g., private or shared).

### Reminders

You can create, read, update, and delete reminders associated with contacts. Reminders can be assigned to specific users, have a scheduled time, and support recurring triggers.

### Interaction Metadata

Folk tracks interaction metadata at the workspace level for contacts, including approximate interaction count, last interaction time, and which users last interacted.

## Events

Folk supports webhooks that follow the [Standard Webhooks specification](https://www.standardwebhooks.com/). Webhooks let you subscribe to events happening in Folk and automatically receive data to your server whenever those events occur. Webhooks can be created via the API or the workspace settings UI. You specify a target URL and subscribe to specific event types. Deliveries include signature headers (`webhook-signature`) for verification.

Webhook events support **filtering** to narrow down notifications — for example, only triggering when a person is added to a specific group or when a deal moves to a specific pipeline status.

### Person Events

- **person.created** — A new person is created in the workspace.
- **person.updated** — A person's native attributes or custom fields are changed. The payload includes the specific changes made.
- **person.deleted** — A person is removed from the workspace. The payload includes basic details (name, emails) since the resource is no longer fetchable.
- **person.groups_updated** — A person is added to or removed from groups.
- **person.workspace_interaction_metadata_updated** — A person's workspace-level interaction metadata changes (e.g., interaction count, last interaction time).

### Company Events

- **company.created** — A new company is created in the workspace.
- **company.updated** — A company's native attributes or custom fields are changed.
- **company.deleted** — A company is removed from the workspace.
- **company.groups_updated** — A company is added to or removed from groups.

### Deal Events

- **object.created** — A new deal is created in a group.
- **object.updated** — A deal's name, custom fields, or other attributes are changed.
- **object.deleted** — A deal is removed from the workspace.

### Note Events

- **note.created** — A new note is created.
- **note.updated** — A note's visibility or content is changed. Note content itself is never included in the payload.
- **note.deleted** — A note is removed.

### Reminder Events

- **reminder.created** — A new reminder is created.
- **reminder.updated** — A reminder's name, visibility, or assigned users are changed.
- **reminder.deleted** — A reminder is removed.
- **reminder.triggered** — A reminder fires at its scheduled time. The payload includes the last and next trigger times.
