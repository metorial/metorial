Now I have a comprehensive picture. Let me compile the specification.

# Slates Specification for Magnetic

## Overview

Magnetic is an all-in-one workflow management platform designed and built for professional services firms. It unifies project management, resource planning, time tracking, and invoicing for consulting firms and agencies. It has modules focused on CRM, Project Management, Accounts and HR.

## Authentication

Magnetic uses **API token** authentication. Each user account has a unique API token that can be retrieved from the Magnetic API page.

- **How to obtain your token:** Browse to the MagneticHQ API page at `https://app.magnetichq.com/Magnetic/API.do` while logged in to MagneticHQ, and click the button to generate/view your token.
- **How to use the token:** The token is passed as a query parameter named `token` on API requests. For example:
  ```
  GET https://app.magnetichq.com/Magnetic/rest/coreAPI/users?token=YOUR_API_TOKEN
  ```
- **Base URL:** `https://app.magnetichq.com/Magnetic/rest/coreAPI/`
- The API is a REST API that returns JSON responses.
- Two-factor authentication (2FA) can be enabled on Magnetic user accounts for added security when logging in, requiring an OTP upon login. This applies to the web login, not the API token itself.

## Features

### Contact & Company Management

Create, find, and manage contacts and their associated companies. Contacts can include details such as name, email, phone numbers, physical/postal addresses, position, tags, and external references. When creating a contact, Magnetic first looks for an existing contact and appends data if found, otherwise creates a new contact and company.

### Opportunity/Job Management

Create opportunities or jobs within the CRM pipeline. Opportunities can be configured with an owner, contact, company, description, amount, due date, tags, access settings, and external references. Comments can also be added to existing opportunities/jobs.

### Task Management

Create and find tasks by name or description. Tasks can be assigned to owners, linked to opportunities/jobs, and configured with status, priority, due date, start date, time estimate, billable flag, tags, and watchers. Comments can be added to existing tasks.

### Time Tracking

Log time on existing tasks by referencing the task code or description and specifying the time logged. This supports tracking billable hours against projects.

### User Management

Retrieve the list of users in your Magnetic account via the API.

### Financial Data (via integrations)

Export and import customers, suppliers, tax invoices, and purchase orders. You can sync invoices, expenses, and client payments from accounting tools like Sage and Xero with Magnetic.

### Notifications

Retrieve notifications from Magnetic, with the option to include all notifications or only new ones.

### Contact Records

Create records (activity logs) on existing contacts, specifying the message, comment type, email, phone, and follow-up date.

## Events

Magnetic does not appear to offer native webhook support or a purpose-built event subscription mechanism through its API. On third-party platforms like Pipedream, a "New Task Created" polling trigger is available that emits events when a new task is created. However, this is a polling-based mechanism provided by the third-party platform, not a native Magnetic webhook. The Zapier integration provides a polling-based "New Notification" trigger that checks for new notifications.

The provider does not support events.
