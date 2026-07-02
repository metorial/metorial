Now let me get more details on webhooks and the specific events supported, as well as more API features like broadcasts, segments, contacts, clients, and classes.I need to find the full list of webhook event types. The documentation only shows `incoming_whatsapp_message` as an example. Let me also check for classes and clients API details, and look for the webhook events enum.Now let me check for the webhook event types enum and the classes API:Now let me check the webhook integration pages for the full list of event types, particularly the appointments and invoice updates pages:Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for Whautomate

## Overview

Whautomate is an omnichannel Customer Engagement and Automation platform that helps businesses provide automated experiences for their customers on various channels including WhatsApp, Instagram, Telegram, Facebook Messenger and Live Chat. The platform supports various business operations, including appointment and class booking, invoicing, payment handling, and subscription management.

## Authentication

Whautomate utilizes API keys to authenticate API requests. These keys act as unique identifiers, granting access to the platform's functionalities.

**Generating an API Key:**

Access your Whautomate account and navigate to Integrations → REST API settings to generate an API key.

**Using the API Key:**

When making API requests, include the API key in the header of your HTTP requests, specifically in the `x-api-key` header parameter.

**API Host:**

The API host varies based on your geographical location. To determine the correct API host, visit the 'Rest API' section under 'Integrations' in your Whautomate account and copy your host name. Use the relevant hostname for your region when making API calls for optimal performance.

Example request header:

```
x-api-key: your-api-key-here
Host: your-region-host.whautomate.com
```

## Features

### Client Management

Manage client records within the platform. Clients represent customers who receive services such as appointments and class bookings. You can create, search, retrieve, update, and delete clients. Clients support detailed profile information including name, phone, email, date of birth, gender, address, emergency contact details, custom fields, and photo. Clients can be filtered by location, tags, date range, and free-text search. You can also add and remove tags from clients to enable segmentation and trigger automations.

### Contact Management

Manage contacts within the platform. Contacts represent messaging channel users (WhatsApp, Instagram, Telegram, Messenger). You can create, search, retrieve, update, and delete contacts. Tags can be associated with contacts, enhancing categorization and triggering automations. Contacts have a stage property (e.g., Subscriber, Lead) that can be used to manage sales funnels.

### Tag Management

Manage tags for both clients and contacts. Tags can be created, retrieved, and deleted. Tags are used across the platform to segment audiences and trigger automation workflows.

### Omnichannel Messaging

Whautomate's Messages feature is designed to streamline messaging capabilities across multiple platforms, including Telegram, Instagram, WhatsApp, and Messenger. You can send text messages, media messages (images, documents, audio, video), and template messages across all supported channels. Messages can be scheduled for future delivery via a `scheduleDateTime` parameter. You can also retrieve message history for a given contact. For WhatsApp, you can only send media and text messages when there is an active session (24-hour period). Template messages can be sent outside the session window on WhatsApp.

### Segmentation

Manage and organize client and contact segments. Segments can be created with criteria-based filtering including tags, exclusion tags, gender, age range, number of days since last activity, contact stage, and primary locations. Segments are used to target broadcasts and automation workflows.

### Broadcasts

Schedule broadcasts on WhatsApp. Broadcasts allow sending WhatsApp template messages to segmented audiences. You can target by segments, class participants, or retarget previous broadcast recipients. Broadcasts support template parameters (header, body, button URL, location, flow), media attachments, and scheduled delivery. Delivery and processing statistics are available for each broadcast.

### Appointment Management

Interact with the appointment management system, allowing you to sync appointments between multiple systems. You can check available appointment slots for a given timeframe, search existing appointments by date range/participant/service/staff, create new appointments, and reschedule existing ones. Appointments are associated with a client, service, staff member, location, date, and time.

### Class Management

Manage group classes and their participants. You can create, retrieve, update, and delete classes. Classes are associated with a location, staff member, service, date/time, and participant capacity. You can manage participants by adding (with BOOKED or WAITLISTED status), cancelling, and listing them. You can also retrieve all class bookings for a specific client.

### Service and Service Category Management

Create, retrieve, update, and delete services. Services define names, descriptions, pricing structures, categories, and staff assignments. Services can be of type APPOINTMENT, CLASS, or ADD_ON, and support configuration for online booking, online payment acceptance, duration, participant count, tax overrides, and advance booking settings. Service categories can also be managed independently.

### Staff Management

Retrieve staff lists and access detailed information about individual staff members within your organization. You can view a staff member's blocked time schedule for a specific date range, identifying periods marked as unavailable due to leaves or personal commitments. You can also create and delete availability blocks for staff.

### Location Management

Retrieve and manage business locations. Locations are used across the platform to organize services, staff, clients, contacts, and messaging channels.

### Webhook Management

Register, retrieve, update, and delete webhook subscriptions via the API. Webhooks are configured with a server URL, optional custom headers, and an array of event types to subscribe to. Webhooks can be activated or deactivated.

## Events

Whautomate provides a Webhook feature designed to facilitate real-time integration with external systems or services. Webhooks allow you to receive real-time notifications when specific events occur. You can subscribe, retrieve, update, and delete webhooks using the API.

Webhooks are registered via the REST API with a server URL, optional custom HTTP headers, and a list of event types. The following event categories are supported:

### Incoming Messages

Triggered when a new message is received from a client. Covers WhatsApp, Instagram, Messenger, Telegram, and Live Chat channels. The event type for WhatsApp is `incoming_whatsapp_message`; other channels follow a similar naming pattern.

### Outgoing Messages

Triggered when sending a new message to a client. Covers WhatsApp, Instagram, Messenger, Telegram, and Live Chat channels.

### Client Events

Includes Client Added, Client Tag Added, and Client Tag Removed triggers. Event types include `client_created`, `client_tag_added`, and `client_tag_removed`.

### Contact Events

Includes Contact Added, Contact Tag Added, and Contact Tag Removed triggers. Event types include `contact_created`, `contact_tag_added`, and `contact_tag_removed`.

### Appointment Updates

Triggered when an appointment is booked, rescheduled, cancelled, etc. by a client. The payload format is similar for updates such as Waitlisted, Visited, Rescheduled, No-Show, and Cancelled.

### Class Participant Updates

Triggered when a class is booked, rescheduled, cancelled, etc. by a client. The payload format is similar for updates such as Waitlisted, Visited, Rescheduled, No-Show, and Cancelled. The event type is `class_participant_updates`.

### Invoice Updates

Triggered when an invoice is created or the invoice status is updated as a draft, paid, pending, and sent.
