Let me fetch the Swagger spec to get more details on the API endpoints.Now let me check the Pipedream source code for more details about the webhook subscription endpoints:Now I have enough information to write the specification.

# Slates Specification for Waiverfile

## Overview

WaiverFile is an online waiver form system that allows individuals to sign their release waivers from a computer, tablet, or mobile device. The API provides access to manage and retrieve waivers, customer data, and events, allowing integration with other services.

## Authentication

WaiverFile uses API keys for authentication. Every API call requires two credentials:

- **API Key** (also called Site Key): A secret key generated in the WaiverFile dashboard.
- **Site ID**: A unique identifier for your WaiverFile account.

To obtain these, log into your WaiverFile dashboard, select Settings >> API, then select the API keys tab. If you do not already have a key created, click on Create a Key to generate a new one. The key is masked, so click the Show button to reveal the key. Below the key is your Site ID.

Both values are passed as query parameters (`apiKey` and `siteID`) on each API request. The base URL for the API is `https://api.waiverfile.com/api/v1/`.

Example request:

```
GET https://api.waiverfile.com/api/v1/GetSiteDetails?apiKey=YOUR_API_KEY&siteID=YOUR_SITE_ID
```

## Features

### Waiver Retrieval and Search

Retrieve signed waivers individually by waiver ID or search for waivers using keywords. The key methods include GetWaiversByReferenceID (which accepts refID1, refID2, refID3 and refIDAny parameters to search across up to 3 reference ID fields) and GetWaiver (which accepts a waiverID to retrieve a complete waiver record with participant data).

- Waiver data includes signer details (name, email, address, phone, DOB), participant information, custom field values, signature status, opt-in preference, and associated event/form data.
- Supports searching by reference IDs to link waivers with external booking or reservation systems.

### Reference ID Integration

WaiverFile allows you to add a waiver into a customer reservation or booking workflow and includes a reference ID feature to link signatures to your existing booking ID so you can monitor signature status automatically.

- The reference ID can be a booking ID, reservation ID, or customer ID. You can use one or several (up to 3) ID numbers.
- Reference IDs are passed via URL parameters (`refid`, `refid2`, `refid3`) when linking to the waiver signing page.

### Event Management

Create, update, and manage events (e.g., parties, classes, tournaments) within WaiverFile. You can create event categories and update the details of existing events.

- Events have properties such as name, date range, location, description, max participants, signing cutoff, associated waiver forms, and manager email lists.
- Event categories help organize events into logical groupings.

### Site Details

Retrieve account-level site information and configuration details via the API.

### Waiver Form Data

Access waiver form definitions, including the agreement text, field configuration, participant fields, signing options, and form settings.

- Forms can include custom questions with various field types (text, number, etc.).
- Forms support configurable options for adult signing, child signing, email verification, opt-in settings, and more.

## Events

WaiverFile supports webhooks that can be configured in the dashboard under **Settings >> API >> Web Hooks**. You can select which triggers are enabled, and the webhook will fire when any of your selected triggers occur. The API also supports programmatic webhook subscription via a Subscription API.

The "skinny payloads" option sends only the ID of the related item, requiring a subsequent API call to fetch the full data. This is generally considered more secure.

### New Waiver

Fires when a new waiver is signed, submitting the waiver data to the configured URL. The payload includes full waiver details: signer info, participants, custom field values, associated event, waiver form definition, reference IDs, and more.

- Subscription API type: `newwaiver`

### New Event

Fires when a new event is created in WaiverFile.

- Subscription API type: `newevent`

### Edit Event

Fires when an existing event in WaiverFile is edited.

- Subscription API type: `editevent`

### Waiver Edited

Fires when changes are made to an existing waiver. Original waivers are always retained within WaiverFile.
