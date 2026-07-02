Now let me look at the actual Agiled API documentation and how authentication works:Let me get more details on the Agiled API and its webhook capabilities:Now let me fetch the Agiled API key help page to get more details on authentication:Now I have enough information to write the specification. Let me compile everything I've learned:

# Slates Specification for Agiled

## Overview

Agiled is a business management platform designed to streamline operations like CRM, project management, finances, and more. It comes with built-in CRM, HRM, Financial Management, Project Management and Time Tracking. Users can manage all of their business in one place and provide a client portal access to their customers.

## Authentication

Agiled uses **API key** authentication combined with a **Brand** identifier.

To authenticate API requests, two values are required:

1. **API Key (`api_token`)**: Found in your Agiled account under the **API Settings** tab in your profile settings. Go to the API Settings tab and copy the API-key. The API key works with all accounts, including both the main and additional domains. The API is available to paid account users only. The API key is passed as a query parameter named `api_token`.

2. **Brand (Domain)**: Your Agiled account domain/brand name, which identifies which account (workspace) the request targets. This is passed as a custom HTTP header named `Brand`. You can find this in the browser address bar when logged in, or under Profile → Brands for additional accounts.

**Example request:**

```
GET https://my.agiled.app/api/v1/users?api_token=YOUR_API_KEY
Headers:
  Accept: application/json
  Brand: your-brand-name
```

The API base URL is `https://my.agiled.app/api/v1/`. API documentation is available at `https://my.agiled.app/developers` (requires login).

## Features

### Contact & Lead Management

Through its API, you can automate various aspects of business management by creating, updating, and retrieving data on leads, customers, projects, tasks, invoices, and payments. Manage contacts (clients, leads, prospects), accounts, and companies. Supported operations include creating contacts, updating them, and managing associated data.

### CRM & Sales Pipeline

Manage and track deals easily in one place. Create custom pipeline stages to track deals according to your business. Includes managing CRM sources, statuses, stages, and sales agents.

### Project Management

Create and manage projects, including updating project details and associating them with contacts or teams. Project management capabilities allow organizations to handle tasks, project details, and team members using customizable templates.

### Task Management

Create, update, and complete tasks. Tasks can be marked as complete and assigned to projects or team members. Tasks can be organized by categories.

### Financial Management — Invoices & Estimates

Administrators can create and send invoices and estimates, track expenses, and accept payments via a centralized dashboard. The API supports creating and updating invoices, estimates, expenses, and products.

### Contracts & Proposals

Create contracts effortlessly. Share documents directly with recipients. Collect e-signatures seamlessly for easy approval. The API allows creating and updating contracts with associated contract types.

### Employee & HR Management

Manage employees, including creating employee records and associating them with departments and designations. Track attendance, leave, time entries, holidays, and productivity.

### Support Tickets

Keep track of support tickets and reply to tickets with reply templates. Assign tickets to teammates. The API supports creating and updating tickets with assigned agents.

### Time Tracking

Time tracking endpoints are available in the public API. Log and manage time entries against projects and tasks.

### Products

Create and save products. Create packages from products. The API supports creating and updating product records.

### Users

Retrieve and manage user accounts within the Agiled workspace.

## Events

Agiled supports **custom webhooks** for integration with third-party services. You have access to custom webhooks and API. Based on available integration platform triggers, the following event categories can be listened to:

### Contact/Account Events

- Triggers when a new account is created.

### Contract Events

- Triggers when a contract is created inside app or through API call.

### Estimate Events

- Triggers when an estimate is created inside app or through API call.

### Invoice Events

- Triggers when an invoice is created inside app or through API call.

### Project Events

- Triggers when a project is created inside app or through API call.

### Task Events

- Triggers when a task is created inside app or through API call.

### Employee Events

- Triggers when an employee is created inside app or through API call.

### Ticket Events

- Triggers when a ticket is created inside app or through API call.

### Product Events

- Triggers when a product is created inside app or through API call.

### CRM Events

- Triggers when a new CRM source is created.
- Triggers when a new CRM status is created.
- Triggers when a new CRM stage is created.
- Triggers when a new sales agent is created.

Note: The detailed webhook configuration mechanism and the exact payload format are not publicly documented outside the Agiled developer portal (which requires authentication). The events listed above are based on triggers available through integration platforms such as Zapier.
