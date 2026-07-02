Now let me look at the Demio API docs more closely and check for webhook/event details.Now I have enough information to compile the specification.

# Slates Specification for Demio

## Overview

Demio is a webinar and virtual event platform that enables businesses to host live, series, and automated (pre-recorded) webinars. It provides registration management, attendee engagement tools (polls, Q&A, chat), and integrations with marketing and CRM platforms.

## Authentication

Demio uses API key-based authentication. Demio uses API keys for authentication.

To authenticate API requests, two credentials are required:

- **API Key**
- **API Secret**

You must have Owner status in Demio to generate API keys and secrets. To view and generate API keys and secrets, go to Account Settings > API.

Both credentials must be passed as HTTP headers on every request:

- `Api-Key`: Your API key
- `Api-Secret`: Your API secret

The base URL for the API is `https://my.demio.com/api/v1`.

Be careful not to share your API Secret with people outside of your company. If you do, you can always click Regenerate and you will get a new API Secret, but your existing integrations will have to be updated with the new key.

## Features

### Event Management

Retrieve and browse webinar events in your account. You can list events, retrieve detailed information about a specific event, and view event dates. Demio supports three different event types: Standard, Series, and Automated. Events can be filtered by type (e.g., past, upcoming, active).

### Registration Management

Register participants for webinar events programmatically. You can integrate webinar registration into your business workflows. Registration requires at minimum an email address and name, along with either an event ID or a registration reference URL. A unique join link is returned upon successful registration.

- Custom fields submitted during registration can be passed along.
- Source tracking is not supported for registrations that occur via the API or Zapier.

### Participant Data

Retrieve participant/attendee data for specific event dates. You can list event date participants to see who attended a given session. This includes attendance status and engagement information, useful for post-webinar follow-up and reporting.

### Join Link Generation

Generate unique join links for registrants to connect to a webinar. This enables custom registration flows where you control how attendees receive their access links.

## Events

Demio supports webhooks for real-time event notifications. Webhooks can be registered via the API by posting to `https://my.demio.com/api/v1/webhooks` with a target URL and a list of event types to subscribe to.

### Registration Events

Triggered when a new registration is created for a webinar. The event type `registration.created` fires when someone registers, and the payload includes registrant details such as email.

### Attendance Events

Triggered when an attendee joins a running webinar. The event type `attendee.joined` fires when an attendee enters the webinar room.

### Webinar Completion Events

Triggers after a webinar has ended. If using a series webinar, it provides the date of the next scheduled series.

### No-Show Events

Triggers when a webinar ends and a registrant did not attend. Useful for automating follow-up workflows for people who missed the event.
