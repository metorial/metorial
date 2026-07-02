Let me fetch the Swagger spec to understand the full API surface.Now let me get more detail on the API entities and webhook events.Now I have enough information to write the specification. Let me compile everything.

# Slates Specification for RepairShopr

## Overview

RepairShopr is a business management platform for service and repair shops. It provides job tracking (ticketing) with an emphasis on great communication. It helps business owners manage their service and repair businesses by automating the job ticketing process, allowing businesses to create jobs, dispatch technicians, track time, send invoices, and communicate with customers.

## Authentication

RepairShopr uses **API key authentication**. RepairShopr uses API keys for authentication.

**Generating an API Token:**

To get your API token, log in to your RepairShopr account, navigate to the upper right corner of the page, click your name and a drop-down menu will appear. Click on Profile/Password, then click API Tokens. Alternatively, go to More > Admin > API - API Tokens and in the upper right, click New Token.

Custom Permissions allow you to choose what access on your account the token will have. You can also choose an expiration date for the token. Rather than using one single API key for every application, you can create a specific token for each app, granting them access to only the information they need.

**Subdomain requirement:**

Each RepairShopr account has a unique subdomain. The subdomain is the leading part of the host on your browser when you are browsing your RepairShopr dashboard. API requests are made to: `https://{subdomain}.repairshopr.com/api/v1/`

**Using the API key:**

Replace `yoursubdomain` with your RepairShopr subdomain and `APIKEY` with your actual key. Note that `?api_key=` must come before any other parameters.

Example: `https://yoursubdomain.repairshopr.com/api/v1/tickets?api_key=APIKEY`

**Required inputs:**

- **Subdomain** – Your RepairShopr account subdomain
- **API Token** – A token generated from the Admin > API > API Tokens section, with custom permissions configured as needed

## Features

### Customer & Contact Management

Manage customer records including creating, updating, searching, and deleting customers. With powerful customer management and search, your entire database is instantly available. Supports multiple contacts per customer and includes notes, custom fields, and detailed customer profiles.

### Ticketing (Job Tracking)

Create, update, search, and manage repair/service tickets. Tickets represent jobs or work orders and can include problem descriptions, status tracking, assignments to technicians, and comments. You can attach files to tickets using the API, useful for adding reports, logs, and other documents.

### Invoicing & Payments

Create and manage invoices linked to tickets and customers. The invoicing system provides the functionality a repair business or retail store needs. Track payments and manage billing for completed work.

### Estimates

Create and manage quotes/estimates. Customers can click in an email to approve or decline work and you get instantly notified.

### Leads

Manage sales leads through the API. You can send form variables to the Leads API to create leads, including from custom forms on your website. Leads can be converted into customers and tickets.

### Inventory & Products

Manage products and inventory levels, including categories, pricing, and stock tracking. You can get detailed information about every serialized instance of your inventory, add serial numbers, or list all existing serial numbers. Supports product photo management.

### Assets

Track customer assets (devices, equipment) associated with customers and tickets. Assets can be searched and linked to tickets for context on what is being repaired.

### Appointments & Calendar

Manage appointments and scheduling for technicians, including field service jobs. Calendar integrations with Gmail and Office365 keep your team on the same page.

### Employee Time Clock

Manage employee clock-in/clock-out records through the API. This can be hooked into NFC badge systems, IoT buttons, or custom mobile apps.

### Call Logs

Create and manage call log entries to track phone interactions with customers.

### Reports

Access reporting data covering tickets, invoices, customers, and inventory for business analytics.

### User & Account Info

Retrieve information about the currently authenticated user and account settings.

## Events

RepairShopr supports webhooks through its **Notification Center**. A webhook delivers data to other applications as it happens. Webhooks are configured by creating a Notification Set under Admin > Notification Center, where you provide a webhook URL and select which events should trigger it.

You paste a webhook URL under the "Webhook URL" field and check the Webhook checkbox for the specific events you want to trigger. You can create multiple notification sets with different webhook URLs for different event categories.

### Ticket Events

Events related to ticket lifecycle changes including ticket creation, status changes, resolution, assignments, and comments. Status changes already include creating a new ticket and resolving a ticket.

### Customer Events

Events triggered when customers are created (e.g., "Customer – Was created"). Includes customer updates and related changes.

### Invoice Events

Events triggered when invoices are created or updated, allowing tracking of billing activity.

### Payment Events

Events triggered when payments are made against invoices.

### Lead Events

Events triggered when new leads are created or updated.

### Appointment Events

Events for appointment creation and changes, including scheduling updates.

### Employee Time Clock Events

Time clock events can also trigger webhooks. Covers clock-in and clock-out activity.
