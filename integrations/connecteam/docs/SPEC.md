Let me get the OAuth 2.0 details and form submission webhook details.I wasn't able to access the Connecteam OAuth 2.0 documentation page directly, but I have enough information from the other sources to compile the specification. The OAuth 2.0 support was recently announced, and the documentation references it as an alternative for "scoped access and short-lived tokens." Let me now compile the full specification.

# Slates Specification for Connecteam

## Overview

Connecteam is a workforce management platform organized into three hubs: Operations, Communications, and HR & Skills. It provides tools for time tracking, scheduling, task management, forms, chat, onboarding, and employee management, primarily targeting deskless (non-desk) employees.

## Authentication

Connecteam supports two authentication methods:

### API Key Authentication

All API requests can be authenticated using a secret API key. To obtain an API key, navigate to Settings → API Keys → Add API Key. The API key is passed via the `X-API-KEY` request header:

```
X-API-KEY: YOUR_API_KEY
```

API key settings are accessible to account owners only. An expiry date is optional when creating an API key; if set, the key will stop working once it expires. Multiple API keys can be created and managed individually.

Base URL: `https://api.connecteam.com`

### OAuth 2.0

For enhanced security with scoped access and short-lived tokens, Connecteam also supports OAuth 2.0. OAuth 2.0 support in the authentication flow was recently added. Specific details about OAuth 2.0 scopes, authorization endpoints, and token endpoints are available in Connecteam's developer documentation at `https://developer.connecteam.com/docs/oauth-20`.

### Access Requirements

API access is determined by your subscription plan and the hubs you've purchased. API access is available on the Expert plan or higher. Your API key grants access only to hubs on eligible plans.

## Features

### User Management

Synchronize and manage employee/user data. Includes creating users, updating user details, and retrieving user data for syncing with third-party systems. Also supports archiving/unarchiving users and managing Smart Groups to organize users dynamically based on custom field values. Users can be promoted to or demoted from admin roles. Activation SMS invitations can optionally be sent when creating new users.

### Custom Fields

Define and manage custom fields on user profiles to capture organization-specific data. Supports various field types including text, date, and dropdown (single and multi-select). Custom field categories can be organized and dropdown options can be managed independently.

### Time Clock

Track employee work hours including clock-in/clock-out activities, time activities, and manual breaks. Supports real-time clocking operations, geofence management for location-based time tracking, timesheet totals retrieval, and time clock settings configuration.

### Time Off

Manage employee time-off policies and requests. Includes retrieving policy types and balances, managing time-off requests, and handling policy assignments to users.

### Scheduler

Manage employee shift scheduling. Supports reading shift custom fields via the Shift Scheduler API; custom fields must be created in the UI but can be read and managed through the API. Includes creating, reading, updating, and deleting shifts, managing shift layers, handling employee unavailability, and auto-assign functionality. Supports multiple schedulers per account.

### Jobs

Manage and organize jobs within Connecteam. Jobs are used for scheduling in the Job Scheduler and for time tracking in the Time Clock. Includes creating jobs (new clients, bookings, worksites), updating job information (e.g., changing a client's address), and deleting irrelevant jobs. Sub-jobs are also supported.

### Forms

Retrieve all forms, retrieve a specific form, and retrieve form submissions from Connecteam. Useful for automating data collection workflows such as food orders, employee referrals, and inspection reports.

### Tasks

Manage Quick Tasks including task boards, task creation and management, labels, and sub-tasks. Tasks can be assigned to users with due dates.

### Chat

Manage chat functionality including conversations, private messages, and custom publishers. Custom publishers can send private messages (DMs) to users; if a conversation already exists it will be reused, otherwise a new one is created.

### Onboarding

Manage user onboarding packs and assignments programmatically as part of HR integration flows. Retrieve onboarding packs and manage pack assignments to users.

### Sales Data

Manage sales-related data including locations and transactions.

### Company Policies

Access company policy settings including pay rule policies.

### Assets

Manage company assets and asset metadata.

### Attachments

Securely upload files to Connecteam's cloud storage for use with other platform features like Chat, Scheduler, Users, and Quick Tasks.

## Events

Connecteam supports webhooks that deliver real-time notifications when events occur. Webhooks can be configured via the UI (Settings → API & Integrations) or programmatically via the Webhook API. Only account owners can create webhooks, and the endpoint URL must be HTTPS.

Each webhook is scoped to a feature type and optionally a specific object (e.g., a specific time clock or scheduler instance). You select which event types to receive per webhook.

### User Events

Supports the following event types: user created, user updated, user deleted, user archived, user restored, user promoted, user demoted.

### Time Activity Events

Notifies of actions taken by users and admins within the time clock system, crucial for real-time monitoring of time-related activities. Event types include: `clock_in`, `clock_out`, `auto_clock_out`, `admin_add`, `admin_edit`, `admin_delete`, and more. Covers shift activities, time-off entries, and manual breaks. Requires specifying a `timeClockId` (objectId) when creating the webhook.

### Form Submission Events

Captures form submissions as soon as they are made. Event types include: `form_submission`, `form_submission_edited`, `manager_field_updated`.

### Scheduler Events

Notifies of shift and availability changes in real-time. Event types include: shift_created, shift_updated, shift_deleted, availability_status_created, availability_status_deleted. For group shifts assigned to multiple users, each user triggers a separate event.

### Task Events

Notifies when Quick Tasks are published or completed. Event types: task_published, task_completed. Recurring tasks do not trigger the task_published event.
