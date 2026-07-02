Let me fetch the actual API documentation from Apiary:Let me try to access the Apiary API docs directly and also look for Eventee's Zapier integration to understand triggers/webhooks:Now let me get the actual API docs from Apiary to understand the endpoints:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Eventee

## Overview

Eventee is an event management platform that provides web and mobile apps for in-person, virtual, and hybrid events. It offers features for event scheduling, attendee engagement (live Q&A, polls, networking), session management, check-in, and event analytics. The platform provides a public REST API for programmatic access to event and attendee data.

## Authentication

Eventee uses **API Token (Bearer Token)** authentication for its Public API.

- **Generating a token:** API tokens are generated from within the Eventee administration panel. Navigate to your event's **Settings → Features** tab and enable the **Public API** feature to generate your token.
- **Using the token:** Include the token in the `Authorization` header of each API request using the Bearer scheme:
  ```
  Authorization: Bearer <api_token>
  ```
- **Base URL:** `https://eventee.co/public/api/v1/`
- The API token is scoped to a specific event. Each event has its own token.
- API access may not be available on all pricing plans; check your Eventee subscription tier for availability.

## Features

### Event Content Management

- Retrieve and manage event content including the event agenda, sessions, stages/rooms, and tracks.
- Update session details such as titles, descriptions, times, and speaker assignments.
- Organize sessions with colorful tracks for easy attendee navigation.

### Attendee Management

- Import attendees into an event with profile information (email, name, photo, phone, biography, social links, job position, company).
- Invite attendees to events, optionally triggering invitation emails.
- Retrieve attendee lists and profile data.
- Delete test or unwanted attendee data.

### Registrations and RSVP

- Invite registrants to events via the API with the same profile fields available as for attendees.
- Manage RSVP-based event access where only invited/imported users can join.

### Check-In

- Manage attendee check-in status programmatically.
- Supports QR code-based check-in workflows.

### Speaker Management

- Manage speaker profiles and their associations with sessions.

## Events

Eventee supports webhook-style event notifications through its Zapier integration, which uses instant triggers (webhooks). The following event categories are available:

### Attendee Joined

- Fires when an imported or invited attendee joins the event in Eventee.

### Attendee Invitation

- Fires when an attendee is imported or invited to an event.

### Check-In Changed

- Fires when any attendee's check-in status is changed (checked in or checked out).

### RSVP Answered

- Fires when a guest responds to an RSVP request for an event.

### New Registration

- Fires when a new registration for an event is created.

**Note:** These webhook-based events are exposed natively through Eventee's Zapier integration. Eventee does not appear to document a standalone webhook subscription API for direct use outside of Zapier.
