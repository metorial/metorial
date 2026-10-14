# JobNimbus Integration Specification

## Overview

JobNimbus is a CRM and project management platform designed for the service/contracting industry (primarily roofing and home services). It provides tools for managing contacts, jobs, tasks, estimates, invoices, work orders, documents, and workflows through configurable boards and statuses.

## Authentication

JobNimbus uses **API Key (Bearer Token)** authentication.

To authenticate, obtain an API key from the JobNimbus dashboard. Each request must include the key in the `Authorization` header as a Bearer token:

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**How to obtain an API key:**

In your JobNimbus account, click on your profile icon or initials in the top right corner. Select Settings from the dropdown menu. In the Settings menu on the left, select Integrations, then select API. Click on the New API key button.

Each API key can be assigned an Access Profile, which gives the integration the specific permissions assigned to that profile. It is recommended to give API tokens Full and Settings access.

**Base URL:** `https://app.jobnimbus.com/api1/`

## Features

### Contact Management

Create, retrieve, update, and delete contacts by marking them inactive. Search for contacts based on various criteria. Retrieve contact-related activities, add notes to contacts, and attach files to contacts. Exposed fields include name, email, phone, address, status, workflow type, tags, and sales rep.

### Job Management

Create, retrieve, and update jobs (projects). Jobs require a Contact ID to associate them with a contact. Jobs move through configurable workflow statuses and can include details like address, description, source, and assignees.

### Task Management

The API provides a `/tasks` endpoint for managing tasks. Tasks can be associated with contacts or jobs, include priority levels, start/due dates, descriptions, and assignees.

### Financial Documents

The integration uses the documented `/v2/estimates` and `/v2/invoices` endpoints. Creation requires a numeric status and line items, associates contacts/jobs through `related` objects, and maps customer notes to `note`. The estimate API is labeled legacy in the provider documentation.

### Attachments / File Management

The integration's `create_file` tool uploads base64 content to contacts using the documented deprecated endpoint. Its request includes numeric file type, `related` contact IDs, `subtype: "contact"`, filename, and `persist: true`.

### Account Discovery

`get_account_settings` retrieves workflows, statuses, task types, activity types, and lead sources from `/account/settings`. `list_users` retrieves team members and assignment IDs from `/account/users`. No dedicated current-user identity endpoint is documented in the public collection.

### API References

See the [official Open API guide](https://support.jobnimbus.com/how-do-i-create-an-integration-using-jobnimbuss-open-api) and its linked [public API collection](https://documenter.getpostman.com/view/3919598/S11PpG4x).

### Activities

Activities include notes, system information, and timestamps. They are associated with a primary record (contact or job) and capture information such as status changes, notes, and email status.

### Querying and Filtering

API requests accept an optional query parameter for filtering results alongside the required content-type and authorization headers. The API supports GET, PUT, and POST HTTP methods.

## Events

JobNimbus supports outbound webhooks through its **automation system**. Webhooks are configured as actions within event-based automations.

### Event-Based Automation Triggers

Automations can be triggered by changes to the following record types: Contact, Job, Task, Work Order, Material Order, Payment, Attachment, or Activity. Each type allows for different conditions.

The trigger action can be set to fire when a record is Created, Modified, Created or Modified, or Deleted.

Conditions can be added to further filter when the automation fires, such as when a Contact's status matches a specific value.

### Webhook Action

Webhooks are available as an automation action that transfers data to an external endpoint URL. The data transferred may include contact information, event or activity information between systems.

The webhook payload includes standard fields for the triggering record type (e.g., contact address, job status, task details). Custom Fields are not included in available webhook actions.

### Available Webhook Record Data

Webhook payloads vary by record type:

- **Contacts/Jobs**: Address, status, dates, assignees, sales rep, tags, source, etc.
- **Tasks**: Title, description, priority, dates, completion status, assignees.
- **Estimates/Invoices/Work Orders/Material Orders**: Dates, status, notes, sales rep, related records.
- **Activities**: Notes, status change details (old/new status), email status, creator info.
