# Slates Specification for Callpage

## Overview

CallPage is a callback automation platform that enables businesses to generate and manage phone calls from website visitors. It provides embeddable widgets that prompt visitors to request immediate or scheduled callbacks, connects them with available managers (agents), and tracks call history and lead data.

## Authentication

The API is stateless and all requests are validated against an API key. The API key can be obtained manually from the CallPage app at `https://core.callpage.io/settings/api`.

The API key is passed via the `Authorization` HTTP header:

```
Authorization: your_api_key_here
```

API tokens support scopes to control access granularity. The available scopes are:

| Scope           | Description                      |
| --------------- | -------------------------------- |
| `calls.view`    | View call information            |
| `managers.view` | View manager information         |
| `managers.edit` | Create and modify managers       |
| `sms.view`      | View SMS messages                |
| `sms.edit`      | Create and modify SMS messages   |
| `voice.view`    | View voice messages              |
| `voice.edit`    | Create and modify voice messages |
| `widgets.view`  | View widget information          |
| `widgets.edit`  | Create and modify widgets        |
| `widgets.call`  | Perform widget calls             |

Previously created API tokens have access to all scopes and all widgets. You can also generate a global API key that gives access to all resources. User-related endpoints use the permissions of the API token's associated user rather than scopes.

**Base URL:** `https://core.callpage.io/api/v1/external`

## Features

### Call Management

Retrieve call history with rich filtering (by date range, status, widget, tags, phone number, user, and incoming number). View individual call details including caller geo-location, UTM data, call duration, recording availability, tags, notes, feedback, and custom form fields. Update custom field values on calls. Call statuses include: new, scheduled, in-progress, ringing, completed, manager-failed, user-failed, failed, and cancelled.

### Initiating Calls

Trigger immediate calls or schedule callbacks programmatically via a widget. The "simple call" option calls all available managers immediately; if none are available, the call is scheduled. The "call or schedule" option automatically falls back to the first available time slot. Calls can be targeted to specific departments or individual managers.

### Widget Management

Create, update, delete, and retrieve widgets. Widgets are configurable with settings such as call algorithm (simultaneous or sequential), call direction (manager-first or client-first), countdown timer value, caller ID mode, call recording, mobile display, after-hours behavior, widget positioning, color scheme, locale/language, and auto-show behavior. Supports 15 languages.

### User Management

Create, retrieve, update, and delete users (agents). Users have roles: owner (full access), admin (everything except billing), and manager (limited to own widgets/calls). Users can be created without an email address, in which case they serve as call operators only and do not count toward subscription limits.

### Manager Management

Managers are the link between users and widgets. Create, update, delete, and list managers for a specific widget. Each manager has configurable business hours (per day of week with timezone support) and can be assigned to departments. Adding users to a widget automatically creates corresponding manager records.

### SMS Message Customization

View, create, update, and reset custom SMS templates per widget. Four message types are available: post-call message to visitor, scheduled call reminder to visitor, post-call message to manager, and missed call notification. Templates support variables like company name, manager name, phone number, and website URL. SMS text is limited to 240 characters.

### Voice Message Customization

View, create, update, and reset custom voice greetings per widget. Two message types: manager greeting (played when the manager picks up) and visitor greeting. Supports MP3, MPGA, and WAV files up to 10 MB. Voice message language is determined by the widget's locale.

## Events

CallPage supports outgoing webhooks that send POST requests with JSON payloads when call-related events occur. Webhooks are configured per widget through the CallPage Dashboard under the widget's Integrations settings.

### Call Scheduled

Fires when a visitor schedules a callback for a later time. Includes call ID, phone number, widget ID, and scheduled time.

### Call New

Fires when a visitor requests an immediate callback. Includes call ID, phone number, and widget ID.

### Call Missed

Fires when a call is missed by either the manager or the visitor. Includes the call status (manager-failed, user-failed, or failed) and the number of call attempts.

### Call Completed

Fires when a call is successfully completed. Includes detailed call timing data (queued, dialed, answered, ended timestamps for both parties), billing time, call direction, recording info, and the manager who handled the call.

### Data Added

Fires when a visitor submits additional information (such as email or feedback) after a call. Includes the same call details as the completed event plus the submitted form fields and their values.

### New Message

Fires when a visitor leaves a message. Includes the visitor's email, message content, phone number, widget ID, and a link to the call in the dashboard.
