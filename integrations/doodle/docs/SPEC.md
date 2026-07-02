Let me look for more current information about Doodle's API, as the old public API was shut down around 2013.Let me check the Doodle API deprecation page and the Postman documentation for more details.Based on my research, Doodle has officially deprecated its API. Let me confirm this is still the case and check if there's any newer development.The research clearly shows that Doodle has deprecated its API. Here's the specification based on the findings:

# Slates Specification for Doodle

## Overview

Doodle is an online scheduling platform that helps users find suitable times for group meetings through polls, booking pages, sign-up sheets, and 1:1 scheduling. It integrates with calendar providers (Google, Outlook, iCloud) and video conferencing tools (Zoom, Google Meet, Webex).

## Authentication

Doodle no longer supports new API. If you have already set up API with your Doodle Enterprise account and have any questions, you should contact their support team.

Historically, Doodle used the following authentication methods:

- **OAuth 2.0**: Doodle's API used OAuth 2.0 for authentication and authorization. This required a Client ID and Secret from a Doodle OAuth application, with scopes configured as required by the application. Historical scopes included `name`, `eMailAddress`, `initiatedPolls`, and `participatedPolls`.

**Important**: Since Doodle has deprecated its API, new integrations cannot be set up. Existing Enterprise customers who previously configured API access may still have legacy access, but this is not guaranteed.

## Features

**⚠️ Doodle's API has been officially deprecated. The features below describe capabilities that were historically available and may still function for legacy Enterprise integrations, but are no longer supported for new setups.**

### Group Poll Management

Create and manage scheduling polls where multiple participants can vote on preferred meeting times. Polls support different voting modes (YES/NO or YES/NO/MAYBE) and can be configured as date-based or text-based polls. Participants can add comments to polls.

### Booking Pages

Personal scheduling pages that allow others to book available time slots directly. Availability is determined by connected calendars. Supports custom branding (paid plans), custom questions, minimum notice periods, and daily booking limits.

### Sign-up Sheets

Allow organizers to offer multiple event slots that participants can sign up for independently, useful for workshops, office hours, or group events.

### Calendar Integration

Sync with Google Calendar, Microsoft Outlook/Office 365, and Apple iCloud calendars. Only availability is shared with external participants, not full calendar details.

### Video Conferencing

Automatically attach video conferencing links (Zoom, Google Meet, Webex) to scheduled meetings.

### Payments

With payments powered by Stripe, you can require customers to pay to book time with you.

## Events

The provider does not support events. Doodle no longer supports new API, and there is no documented webhook or event subscription mechanism. Doodle connects to Zapier for workflow automation, but this is a third-party integration rather than a native event system.
