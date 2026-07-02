Let me try to access the actual CalendarHero API documentation and look for more details about the Pipedream integration which seems to have more info.Let me try to access the CalendarHero Zapier page for more details on what actions/triggers are available.Now I have enough information to compile the specification. Let me synthesize what I've found.

# Slates Specification for CalendarHero

## Overview

CalendarHero is a meeting scheduling platform that automates booking for 1:1, group, and video meetings using real-time calendar availability. It supports scheduling links, attendee insights, meeting briefings, and integrates with 60+ tools including calendar providers, video conferencing, CRMs, and chat apps. The platform is accessible via web, email add-ons (Gmail/Outlook), chat platforms (Slack/Teams), and SMS.

## Authentication

CalendarHero uses API keys for authentication. CalendarHero has a published API, and to use it you log in to your CalendarHero account and find your API authentication token in the account settings.

The API key is passed in the `Authorization` header of each request. Based on the Pipedream integration code, the format is:

```
Authorization: {api_key}
```

The base URL for API requests is `https://api.calendarhero.com`.

No OAuth flow or additional scopes are required. Each user generates their own API token from within their CalendarHero account dashboard.

## Features

### User Profile

Retrieve the authenticated user's account information. This provides basic details about the CalendarHero user associated with the API key.

### Meeting Types

Get the user's meeting types. Meeting types are reusable templates that define settings for different kinds of meetings, including duration, availability windows, video conferencing provider, location, buffer times, and invitee questions. You can find the details of a specific meeting type (and the scheduling link).

### Meetings

Get the user's meetings within a timeframe. This allows querying scheduled meetings filtered by date range. Meeting data includes attendee information, meeting time, and associated meeting type details.

### Meeting Requests

Create a meeting request with one or more contacts. Meeting requests are automated invitations sent to contacts where CalendarHero finds the best time to meet based on availability.

- Parameters include the date/time of the start and end of the requested timeframe.

### Contacts

- Create a contact in CalendarHero.
- Search contacts that match search criteria.
- Find a specific contact's detailed information, including insights such as job history, personality, social media links, tweets, and photos.

### Webhook Subscriptions

Create webhook subscriptions to receive data about scheduled events. CalendarHero provides a webhooks management API.

## Events

CalendarHero supports webhooks that notify external systems in real-time when specific scheduling events occur. The following event types are available:

### Meeting Request Successfully Scheduled

Triggers when a meeting request is successfully turned into a meeting event. This fires when an attendee accepts a meeting request and a calendar event is created.

### New Meeting Request Created

Triggers when a new meeting request is created by you. This fires when the user initiates a new meeting request through CalendarHero.

### Meeting Request Expired

Triggers when a meeting request expires (the requested attendees do not accept it before the end timeframe).

### Meeting Request Cancelled

Triggers when a meeting request was cancelled by the requesting user.

### New Contact via Scheduling Link

Triggered when a new contact is added through any of your personal scheduling links. This fires when an external invitee books a meeting via a scheduling link and is added as a new contact.
