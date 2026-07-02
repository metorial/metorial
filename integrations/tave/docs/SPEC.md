Now let me look at the Tave API documentation more closely and the Zapier integration to understand specific features.Now I have a comprehensive picture. Let me compile the specification. Tave has two distinct API mechanisms:

1. **New Lead API** (legacy webservice): Uses a Secret Key + Studio ID, posted to `https://tave.app/webservice/create-lead/{studio_id}`
2. **Public API V2**: Uses API Keys, base URL `https://tave.io/v2`

The Zapier integration (now under "VSCO Workspace") shows specific triggers and actions available.

# Slates Specification for Tave

## Overview

Tave (now VSCO Workspace) is a CRM and studio management platform designed for photographers and creative professionals. It provides tools for lead tracking, client management, job/order management, invoicing, contracts, scheduling, workflow automation, and financial reporting.

## Authentication

Tave supports two authentication mechanisms depending on the API being used:

### Public API (V2)

- **Method:** API Key
- **Base URL:** `https://tave.io/v2`
- API keys are created in **Settings › API Integrations › New API Key** within the Tave account.
- Each key has a configurable permission level: **Read Only** or **Read and Write**.
- It is recommended to create a separate API key per application.
- Keys can be revoked at any time from the settings panel.

### New Lead API (Legacy Webservice)

- **Method:** Secret Key + Studio ID
- **Endpoint:** `https://tave.app/webservice/create-lead/{studio_id}`
- The Secret Key is passed in the request body as a `SecretKey` field alongside the lead data.
- The Studio ID is a unique identifier for the account and is part of the URL path.
- Both credentials are found under **Settings › New Lead API** in the Tave account.

## Features

### Lead Management

Create leads directly in Tave from external sources such as website contact forms. Leads can include details like name, email, phone, brand, job type, and job role. This is commonly used to feed inquiries from custom forms into Tave's pipeline.

### Contact Management

Create, search, and retrieve contacts in the Tave address book. Contacts can be filtered by contact kind (e.g., individual, business) and brand. Custom fields can be attached to contacts.

### Job Management

Create and manage jobs (projects/bookings) with associated details including job type, job stage, job role assignments, event types, event dates/times, and timezones. Jobs link contacts to specific work engagements like weddings or photo sessions. Custom job fields are supported.

### Order and Booking Tracking

Track orders as they are booked, including both manually created orders and electronic bookings made through client-facing portals. Orders can be filtered by brand and job type.

### Payment Tracking

Monitor payments as they are created within the system. Payments can be filtered by brand and job type.

### Brand Management

Retrieve and manage brands configured in the account. Brands represent different business identities or product lines under a single Tave account.

### Workflow Automation (Web Requests)

Tave's built-in automation engine can make outbound HTTP requests (web requests) when workflow tasks are triggered. This allows sending data from Tave to external services using token-based templates (e.g., `{{primary_contact.first_name}}`). This is commonly used to push data to third-party webhooks or services.

## Events

Tave does not provide a traditional webhook registration API for arbitrary endpoints. However, it supports event-driven triggers through its Zapier integration (built on the Public API), which uses instant webhook-style triggers for the following events:

### Contact Created

Fires when a new contact is created in Tave. Can be filtered by contact kind and brand.

### Order Booked

Fires when an order is booked, including both manually booked orders in the manager interface and electronic bookings made by clients. Can be filtered by brand and job type.

### Payment Created

Fires when a new payment is recorded in Tave. Can be filtered by brand and job type.

Additionally, Tave's **Web Request Automation** feature allows configuring outbound HTTP POST requests from within Tave's workflow engine to any URL when specific workflow tasks are completed. This functions as an outbound webhook mechanism, passing templated data (contact details, job information, etc.) to external endpoints.
