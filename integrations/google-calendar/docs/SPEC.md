# Slates Specification for Google Calendar

## Overview

Google Calendar is Google's time-management and scheduling service. The Google Calendar API is a RESTful API that exposes most of the features available in the Google Calendar Web interface, enabling programmatic management of calendars, events, access control, and scheduling.

## Authentication

Google Calendar API exclusively uses **OAuth 2.0** for authentication. The application must use the OAuth 2.0 to authorize requests – other authorization protocols are not supported.

**Setup Requirements:**

1. Create a project in the Google Cloud Console and enable the Google Calendar API.
2. Configure an OAuth consent screen (choose Internal for organization-only access, or External for public access).
3. Create OAuth 2.0 client credentials (Client ID and Client Secret).
4. For server-to-server access (e.g., Google Workspace domain-wide delegation), a **service account** can be used with domain-wide delegation enabled by a Workspace admin.

**OAuth 2.0 Endpoints:**

- Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`

**Available Scopes:**

| Scope                                                             | Description                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/calendar`                        | Full access: see, edit, share, and permanently delete all accessible calendars. |
| `https://www.googleapis.com/auth/calendar.readonly`               | Read-only access to all accessible calendars.                                   |
| `https://www.googleapis.com/auth/calendar.events`                 | View and edit events on all calendars.                                          |
| `https://www.googleapis.com/auth/calendar.events.readonly`        | View events on all calendars.                                                   |
| `https://www.googleapis.com/auth/calendar.events.owned`           | Manage events only on calendars the user owns.                                  |
| `https://www.googleapis.com/auth/calendar.events.owned.readonly`  | View events only on calendars the user owns.                                    |
| `https://www.googleapis.com/auth/calendar.events.freebusy`        | View availability on accessible calendars.                                      |
| `https://www.googleapis.com/auth/calendar.events.public.readonly` | View events on public calendars.                                                |
| `https://www.googleapis.com/auth/calendar.freebusy`               | View free/busy availability only.                                               |
| `https://www.googleapis.com/auth/calendar.settings.readonly`      | View Calendar settings.                                                         |
| `https://www.googleapis.com/auth/calendar.calendars`              | See/change calendar properties and create secondary calendars.                  |
| `https://www.googleapis.com/auth/calendar.calendars.readonly`     | View calendar properties (title, description, timezone, etc.).                  |
| `https://www.googleapis.com/auth/calendar.calendarlist`           | See, add, and remove subscribed calendars.                                      |
| `https://www.googleapis.com/auth/calendar.calendarlist.readonly`  | View the list of subscribed calendars.                                          |
| `https://www.googleapis.com/auth/calendar.acls`                   | View and change sharing permissions on owned calendars.                         |
| `https://www.googleapis.com/auth/calendar.acls.readonly`          | View sharing permissions on owned calendars.                                    |
| `https://www.googleapis.com/auth/calendar.app.created`            | Manage secondary calendars and their events (app-created only).                 |

**Service Accounts & Domain-Wide Delegation:**
Internal apps (e.g., automation apps) can use service accounts with domain-wide delegation to access user data, for example adding events to users' calendars without individual user consent. This requires a Google Workspace super admin to authorize the service account's client ID with specific scopes.

## Features

### Event Management

Create, read, update, and delete events on any accessible calendar. Events contain information such as title, start and end times, and attendees, and can be either single events or recurring events. Events support rich properties including location, description, attachments, conference data (Google Meet links), reminders, visibility settings, and custom color.

- **Recurring events**: Define events with recurrence rules (RRULE). Individual instances of recurring events can be modified or cancelled independently.
- **Attendee management**: Invite attendees by email and control whether notification emails are sent on creation or update.
- **Quick add**: Create events from a simple text string (natural language parsing).
- Events can be moved between calendars.

### Calendar Management

Calendars are collections of events, each with associated metadata such as description or default time zone. You can create secondary calendars, update calendar properties, and delete calendars.

### Calendar List Management

The calendar list represents all calendars on a user's calendar list in the Calendar UI. You can add (subscribe to) or remove calendars from a user's list, and customize per-user display properties like color and visibility.

### Access Control (Sharing)

Manage sharing permissions (ACLs) on calendars. You can grant or revoke access for specific users or groups, with roles such as reader, writer, or owner. This controls who can view or edit a calendar.

### Free/Busy Queries

Returns free/busy information for a set of calendars. This allows checking availability for one or more users over a given time range without exposing event details. Useful for scheduling and finding open meeting times.

- Requires specifying a time range and list of calendar IDs or group IDs.

### Event Types (Focus Time, Out of Office, Working Location)

The API supports special event types beyond standard events, including focus time, out of office, and working location events. These allow managing a user's calendar status programmatically.

### Settings

View user-level Calendar settings such as timezone, date format, default event length, and notification preferences (read-only via API).

### Colors

Retrieve the set of available calendar and event color definitions used in the Google Calendar UI.

### Incremental Synchronization

The API supports efficient sync of calendar data using sync tokens. After an initial full fetch, subsequent requests return only changed items. This is useful for keeping a local copy of calendar data up to date.

## Events

The Google Calendar API provides push notifications that let you monitor changes in resources, eliminating the extra network and compute costs involved with polling resources to determine if they have changed. Whenever a watched resource changes, the Google Calendar API notifies your application.

Push notifications are delivered as webhook callbacks to an HTTPS endpoint you register. You set up a notification channel for each resource endpoint you want to watch. A channel specifies routing information for notification messages, including the specific URL where you want to receive notifications. Whenever a channel's resource changes, the Google Calendar API sends a notification message as a POST request to that URL.

Google Calendar's push notification system operates at the resource level rather than providing granular event-type filtering. When you create a watch channel for a calendar resource, Google sends notifications whenever any change occurs to that resource. The webhook notification does not include the actual event data in the payload — it serves as a signal that something changed. Your application must make subsequent API calls to retrieve the specific changes.

Google Calendar supports notification channels for up to one week before requiring renewal.

### Watchable Resource Categories

Currently, the Google Calendar API supports notifications for changes to the Acl, CalendarList, Events, and Settings resources.

- **Events**: Receive notifications when any event on a specific calendar is created, updated, or deleted. You specify the calendar ID to watch.
- **CalendarList**: Receive notifications when the user's calendar list changes (calendars added, removed, or modified).
- **ACL**: Receive notifications when sharing permissions on a specific calendar change.
- **Settings**: Receive notifications when the user's calendar settings change.

### Configuration Options

- **Webhook URL**: Must be an HTTPS endpoint with a valid SSL certificate.
- **Channel token**: An optional arbitrary string for routing or verification purposes.
- **Channel ID**: A unique identifier you provide for each notification channel.
- **Expiration**: Channels expire (typically after about one week) and must be renewed.
- Some resources do not support webhook notifications (e.g., globally shared calendars like "Public holidays"), which will raise an exception when attempting to watch them.
