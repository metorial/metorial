Now I have a comprehensive view of the AccuLynx API. Let me compile the specification.

# Slates Specification for Acculynx

## Overview

AccuLynx is an all-in-one business management and CRM platform designed for roofing contractors. It covers sales, production, finance, and operations management including job tracking, estimates, invoicing, contact management, scheduling, and document management.

## Authentication

All API requests require authentication via an API Key. An API Key must be sent with every request.

Each integration within an AccuLynx account location should have its own API Key. Accounts with multiple locations will need to connect each location to the API individually.

**Obtaining an API Key:**

Go to Account Settings > Add-On Features and Integrations > API Keys in your AccuLynx dashboard. Click "Create Key" to generate your unique API key. The API key management page is available at `https://my.acculynx.com/apikeys`.

**Using the API Key:**

For every request, you'll need to include your API key in the authorization header as a Bearer token.

Example header:

```
Authorization: Bearer <your_api_key>
```

**Base URL:** `https://api.acculynx.com/api/v2/`

## Features

### Job Management

Create, retrieve, search, and manage roofing jobs. You can create a job in AccuLynx with basic info; the only thing required is the contactId of an already existing contact. Jobs can be filtered by assignment status (e.g., unassigned), milestones (e.g., Lead, Dead), and date ranges. You can also assign insurance companies to jobs, set external references, manage job representatives (company rep, sales owner, A/R owner), and view job change history.

### Contact Management

Get a listing of contacts, create new contacts, and search for existing contacts. You can retrieve contact details including email addresses and phone numbers. You can create a log entry for a specific contact by its ID, including details such as the type of communication (e.g., phone call, SMS, email), the date of the interaction, and an optional description.

### Estimates

Get all estimates for the current location, retrieve individual estimates, and drill down into estimate sections and section items. Estimates can also be retrieved per job.

### Financials & Invoices

Access job financials, worksheets, and financial amendments. Create worksheet items. Retrieve detailed information about a specific invoice by its ID. Check the status of the accounting integration status for a job.

### Supplements

Retrieve supplements across the company, get individual supplement details, items, and notations.

### Payments

View job payments and payment overviews. Create payment records for received payments, paid payments, and additional job expenses.

### Calendar & Appointments

Retrieve a list of calendars for a location, view appointment summaries, and get appointment details. Manage initial appointments for jobs (create or update).

### Measurements

Create manual measurements for a job and upload measurement files (XML and JSON formats).

### Documents & Media

Upload documents, photos, and videos to a job. Documents can be added to specific folders.

### Job Messages

Create and reply to messages on a job record.

### Company Settings

Retrieve company configuration data including insurance companies, job categories, trade types, work types, lead sources, milestones, statuses, document folders, photo/video tags, active account types, and location settings (countries/states).

### Users

Retrieve a list of users or an individual user for the account.

### Reports

Access scheduled report instances, retrieve report data by instance, and get the latest report instance. View report recipients.

### Leads

Retrieve the history of a specified lead.

### Reference Data

Access AccuLynx system-wide reference data including countries, states, and units of measure.

## Events

AccuLynx supports webhooks that deliver real-time notifications when specific events occur. You register an endpoint URL on your server and use your API Key to create a subscription, providing your registered URL. You can manage subscriptions (create, update, delete, list) and send test events via the API.

### Contact Events

- **Contact Added** — Triggered when a new contact is added.
- **Contact Changed** — Triggered when an existing contact is modified.

### Job Lifecycle Events

- **Job Created** — Triggered when a new job is created in AccuLynx.
- **Job Updated** — Triggered when an existing job is updated in AccuLynx.

### Job Milestone & Status Events

- **Job Milestone Changed** — Triggered when the milestone changes on an existing job.
- **Job Milestone Status Changed** — Triggered when a job changes its status inside a given milestone. Available for Elite accounts with custom workflows enabled.

### Job Contact Events

- **Job Primary Contact Changed** — Triggered when the primary contact on a job is changed or added.
- **Job Contacts Primary Changed** — Triggered when the primary contact details on a job are modified.

### Job Classification Events

- **Job Category Changed** — Triggered when a job's category changes.
- **Job Trade Type Changed** — Triggered when a job's trade type changes.
- **Job Work Type Changed** — Triggered when a job's work type changes.

### Job Financial Events

- **Approved Job Value Changed** — Triggered when the approved job value of an existing job changes.
- **Invoice Updated** — Triggered when an existing invoice is updated in AccuLynx.
- **Invoice Voided** — Triggered when an invoice is voided.

### Job Appointment Events

- **Initial Appointment Created** — Triggered when an initial appointment is created for a job.
- **Initial Appointment Updated** — Triggered when an initial appointment is updated for a job.

### Job Representative Events

- **Company Representative Assigned** — Triggered when a company representative is assigned to a job.
- **Company Representative Changed** — Triggered when the company representative on a job is changed.

### Job Accounting Events

- **Accounting Integration Status Changed** — Triggered when the accounting integration sync status changes for a job.
