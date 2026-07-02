# Slates Specification for Freshsales

## Overview

Freshsales is a cloud-based CRM (Customer Relationship Management) platform by Freshworks designed for sales teams. It provides integrated phone and email, user behavior tracking, lead scoring and more. The API provides access to various resources like leads, contacts, deals, tasks, appointments, etc.

## Authentication

Freshsales uses **API key-based authentication**. Each user in Freshsales is provided with a unique API key.

**Finding your API key:**
Click your profile picture and select Profile Settings. Click the API Settings tab. You can find your API key in the field "Your API key".

**Using the API key:**
Include your API key in the Authorization header of your HTTP requests, formatted as `Token token=YOUR_API_KEY`.

Example:

```
Authorization: Token token=sfg999666t673t7t82
Content-Type: application/json
```

**Domain / Bundle Alias:**
In order to authenticate you need to know your API key and Bundle alias. To specify the CRM account to be used in the API, you need to know the bundle alias of the CRM account. The bundle alias is found in the same API Settings tab, below the API key.

API requests follow the format: `https://{bundle_alias}.myfreshworks.com/crm/sales/api/{resource}` (for Freshworks CRM) or `https://{domain}.freshsales.io/api/{resource}` (for Freshsales Classic).

Using the APIs, users would only be able to view data that they have access to.

## Features

### Lead Management

Create, view, update, delete, and list leads. You can create or update a lead based on a unique identifier value — it searches for a record with the value mentioned and updates it if found, else it creates the record. Leads can be converted to contacts. You can add, update, or remove team members of the lead team. Leads support custom fields, filtering via views, sorting, and activity tracking.

### Contact Management

Create, view, update, delete, and list contacts. Contacts can be associated with multiple accounts. Contacts support custom fields, filtered views, and activity history retrieval.

### Account (Company) Management

Companies with whom you have an existing business relationship are saved as Accounts. Usually one or more individuals (contacts) are associated to the account with whom you pursue sales opportunities. Full CRUD operations are supported, along with filtering and sorting.

### Deal Management

Create, view, update, delete, and list deals. You can manage deals with the pipeline view and drive more deals to closure. Deals can be associated with contacts and accounts.

### Tasks and Appointments

Create, view, update, delete, and list tasks and appointments. Tasks are organized according to status and due date (open, due today, due tomorrow, overdue, completed). Appointments are divided into past and upcoming.

### Notes and Activities

Create notes for leads, contacts, accounts, and deals. Track sales activities and retrieve activity timelines for contacts and leads.

### Search and Filtering

Search across entities (leads, contacts, etc.) using keywords. Filter records based on certain conditions using the filterize option in real-time, applicable for contacts, accounts, and deals. Use saved views to retrieve filtered record sets.

### Sales Activities

Log and manage sales activities such as calls, emails, and custom activities associated with leads, contacts, and deals.

### Files and Documents

List and manage file and document associations on records.

### Settings and Customization

Retrieve field metadata for contacts, leads, deals, accounts, and sales activities. Create and manage custom modules.

## Events

Freshsales supports outbound webhooks configured through its **Workflow** automation feature. Webhooks are event-based triggers that send HTTP requests to a third-party app or website when defined conditions are met. Freshsales does not expose a standalone webhook subscription API — webhooks are configured as actions within workflows through the Freshsales admin UI.

### Workflow-based Webhooks

Workflows in Freshsales allow you to automate actions as soon as an event trigger occurs or at a specific date/time. You can automatically update field properties, send email alerts, create follow-up tasks, and send notifications to third-party apps via webhooks.

- **Supported modules:** Workflows can be configured on contacts, leads, accounts, deals, and appointments.
- **Trigger types:**
  - Record-based: when a record is created, or when a record is created or updated.
  - Time-based: every day, every week, or every month at specified times.
- **Recurrence:** Workflows can be set to run once per record or recurrently for the same record whenever trigger conditions are met.
- **Conditions:** Workflows support AND/OR condition logic to filter which records trigger the webhook.
- **Webhook configuration:** Supports GET, POST, PUT, DELETE request types. Encoding types include JSON, XML, or X-FORM-ENCODED. Content can be simple (selected fields) or advanced (custom API payloads with placeholders). Custom headers and authentication can be added.
- **Limitations:** Webhooks are configured via the Freshsales UI (not programmatically via API). On failure, the application will retry sending the request for the next 2 days before permanently terminating the webhook request.
