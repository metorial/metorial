Now let me get the Swagger UI documentation to understand the available endpoints and webhook details:Now let me look for more details on the webhook event types and the CRM's features available via API:Now I have enough information. Let me compile the specification.

# Slates Specification for CentralStationCRM

## Overview

CentralStationCRM is a cloud-based customer relationship management platform built for small teams and SMEs. It is a web-based CRM solution offering features for contact and communications management, centralizing the storage of contacts, notes, emails, and tasks in one place, and includes a deals section for managing sales prospects. As a German company, CentralStationCRM stores all customer data in Germany under German data protection regulations.

## Authentication

The CentralStationCRM API uses API keys to authenticate requests. You can view and manage your API keys in the account settings.

Every CentralStationCRM user can create an API key in "My settings". The API key must then be passed via the header `X-apikey` for each call. Passing the API key as a URL parameter is deprecated.

All API requests must be made over HTTPS. API requests without authentication will fail.

The API base URL is tenant-specific, following the pattern:

```
https://{accountname}.centralstationcrm.net/api/
```

Where `{accountname}` is the unique subdomain for your CentralStationCRM account (e.g., `mycompany.centralstationcrm.net`).

**Required credentials:**

- **API Key**: Generated per user in "My Settings" → "Manage external applications (API)"
- **Account Name**: Your CentralStationCRM subdomain/account name

## Features

### Contact Management (People & Companies)

A contact page contains all contact details, notes, emails, documents, and upcoming tasks. The API allows creating, reading, updating, and deleting both people and company records. You can add addresses, assistants, avatars, and contact details to people, making every customer profile richer. People and companies can be linked to each other.

### Deal Management

The deal section gives you an overview of expected income and is a way to keep track of how sales are doing. You may use tags to categorize and filter deals by product type or customer group. Deals include properties such as due date, volume, and probability. Deals can be associated with people and companies.

### Project Management

Once you win a deal, you can turn it into a project and start with tasks and to-do lists. Projects serve as a way to organize post-sale work and ongoing engagements.

### Task Management

You can keep an eye on upcoming tasks and collaborate with coworkers. Tasks can be assigned to users and linked to contacts, deals, or projects.

### Notes & Communication History

Notes, tasks, telephone calls, emails, and more can be stored so that employees always have all the important information available. The API allows creating and retrieving notes associated with contacts, deals, and projects.

### Tagging & Filtering

You can tag contacts or leads with keywords which makes it easy to filter for certain criteria like the industry, area, or channel. Tags are available on people, companies, and deals.

### Email Logging

You can retrieve the current API user's maildrop for people and companies, which is used for forwarding emails into CRM records. The API provides access to email records stored against contacts.

### Milestones & Life Events

You can record important life events or milestones (like birthdays or anniversaries) for each person to support personalized outreach.

### Statistics

The API offers a stats function that provides counts and sums for various objects (e.g., number of deals, sum of deal values).

## Events

CentralStationCRM supports webhooks for monitoring changes in the CRM.

To create webhooks, click on the cogwheel at the top right of the CRM and then on "Account settings", then select "Manage webhooks" in the "Users & access rights" section. Webhooks can also be managed via the API.

### CRM Object Events

Webhooks can be configured to fire when CRM objects are created, updated, or deleted. Based on the available object types in the API, events can be monitored for resources such as people, companies, deals, tasks, notes, and projects.

- **Configuration**: Each webhook is configured with a target URL, the object type, and the event action (create, update, delete).
- Every non-GET API request allows submitting an optional `reference_for_webhooks` param. When the request triggers any webhook, the same param is returned in the webhook body. This makes workflows in n8n, Zapier, or other tools easier and allows ending infinite loops.

**Considerations:**

- Webhooks can only send data from CentralStationCRM to external applications, not vice versa.
- Webhooks for official CentralStationCRM integrations are managed separately and can only be removed by terminating the respective integration.
