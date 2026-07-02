Let me look at the Zapier integration page for more details on what features Evenium exposes, and also try to find the actual API docs.Now I have enough information to compile the specification. Let me also check the integrations page on Evenium's website for more details.Now I have comprehensive information to write the specification.

# Slates Specification for Evenium

## Overview

Evenium is an event management platform that provides tools for event invitation and registration, onsite check-in, attendee engagement, and virtual/hybrid event hosting. Evenium .NET handles registration, OnSite takes care of entry management, and ConnexMe is a mobile event app that provides interactive tools to attendees and meetings. The company offers services including invitation and registration, onsite check-in, event applications, virtual event platforms, and solutions for life sciences events and sponsored seats allocation.

## Authentication

Evenium supports API key-based authentication.

- **API Key (Access Token):** Evenium uses API keys for authentication. You can find your access token on API Key under the Profile menu on the top right of your Evenium account.
- **Base URL:** `https://secure.evenium.com/api/1/`
- **Usage:** The access token is passed as a query parameter named `accessToken` on API requests. For example: `https://secure.evenium.com/api/1/contacts?accessToken=YOUR_ACCESS_TOKEN`

Note: Some third-party integration platforms (such as Relevance AI) reference OAuth-based authentication for Evenium. The integration uses secure OAuth authentication, ensuring only authorized workflows access your Evenium event data. However, the primary documented API authentication method is API key-based. OAuth may be available for specific partner integrations.

## Features

### Event Management

- Create and manage professional events with details such as title, start/end dates, event code, address, city, country, zip code, URL, and description.
- Retrieve a list of events associated with your account.

### Participant / Attendee Management

- Add participants to events with details including first name, last name, email, status, company, job title, phone numbers, address, and comments.
- Retrieve participant lists for specific events.
- Track participant registration status (e.g., invited, registered, confirmed, cancelled, attended).
- Support for external contact and guest IDs for mapping to external systems (e.g., CRM).

### Contact Management

- Access and manage the contacts database associated with your Evenium account.
- The `/contacts` endpoint serves as the base resource for contact data.

### Ticketing

- Track ticket orders and updates for events.
- Monitor when new tickets are ordered or existing tickets are updated on a specific event.

### CRM Integration Support

- Evenium has a plugin available for WordPress, Salesforce and Facebook.
- Native integration with Veeva CRM for life sciences use cases.
- External contact/guest ID fields allow mapping participants to records in external CRM systems.

## Events

Evenium does not appear to offer native webhooks or a purpose-built event subscription mechanism through its public API. According to API Tracker, Evenium does not list webhooks, webhooks management API, or sandbox environment support.

The Zapier integration for Evenium uses polling-based triggers (not webhooks) to detect changes. The available polling triggers include:

- **New Event:** Detects when a new event is created.
- **New Participant on Event:** Detects when a new participant is added to a specific event.
- **New or Updated Participant on Event:** Detects when a participant is added or updated on a specific event.
- **New & Updated Ticket on Event:** Detects when a new ticket is ordered or updated on a specific event.

These are polling-based mechanisms provided through Zapier's integration layer, not native Evenium webhooks. The provider does not support native webhook or event subscription functionality.
