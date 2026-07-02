Let me get more details from the actual API documentation.Now let me look at the actual API docs for more details on resources and webhooks:Let me try to access the actual Pipeline CRM API documentation to see the full list of resources:Now I have enough information to compile the specification. Let me note the key findings:

1. **Pipeline CRM** (formerly PipelineDeals) is a sales CRM platform
2. **Authentication**: API key-based, with both an API Key (per user) and an App Key (per integration). Passed as query parameters (`api_key` and `app_key`)
3. **API base URL**: `https://api.pipelinecrm.com/api/v3/`
4. **Resources**: Deals, People, Companies, Activities/Calendar Events, Notes, Users, Custom Fields
5. **Web-to-Leads**: special feature for capturing leads from website forms
6. **No native webhooks** found in Pipeline CRM's own API documentation - integrations with webhooks appear to go through Zapier

# Slates Specification for Pipeline CRM

## Overview

Pipeline CRM (formerly PipelineDeals) is a cloud-based sales CRM platform designed for small and mid-sized sales teams. It allows users to access and manage leads, deals, contacts, and activities. The platform provides deal tracking, contact management, and sales forecasting capabilities.

## Authentication

PipelineCRM uses API key-based authentication to secure API requests.

Pipeline CRM requires two credentials for API access:

1. **App Key**: An application-level key that identifies the integration. Generated in Account Settings under the API Integrations section. You must be an admin to access API settings.

2. **API Key**: A user-level key that authenticates the specific user. Retrieved in the API Keys section of the API settings. Admins can find the API keys associated with the account in Account Settings under API Integrations > API Keys.

Both keys are passed as query parameters on each request. For example:

```
https://api.pipelinecrm.com/api/v3/deals.json?api_key=USER_API_KEY&app_key=APP_KEY
```

The authentication strategy can be set to "Both JWT and API Key" when creating an integration, though API key-based query parameter authentication is the standard approach.

To set up:

1. Log in to Pipeline CRM as an admin
2. Go to Settings in the lower-left corner, select the API tab, and select the API Integrations section to generate an App Key.
3. Select the API Keys section to retrieve the API Key for a user.

The API base URL is `https://api.pipelinecrm.com/api/v3/`.

## Features

### Deal Management

Create, read, update, and manage sales deals (opportunities) within the CRM. Deals include properties such as name, value, currency, and stage. Deals can be associated with people and companies. Deals can be linked to existing companies by name, and new companies are automatically created when no match is found.

### Contact (People) Management

Manage person records in the CRM, including creating, retrieving, updating, and searching contacts. When creating a person, duplicate email address checking can be enabled to prevent duplicate records. People can be associated with companies and assigned to users. If a company with that name already exists, the person is associated with the existing company; otherwise a new company is created.

### Company Management

Create and manage company records in the CRM. Companies serve as organizational entities that people and deals can be linked to. You can also search for existing companies.

### Activities and Calendar Events

Create and manage calendar events in the Pipeline account. Events can be configured as all-day tasks. Tasks can be associated with a person, company, or deal.

### Notes

Add notes to records (people, companies, deals). Notes can be categorized (e.g., Phone Call, SMS) and contain free-text content associated with CRM records.

### Custom Fields

Custom fields let you tailor Pipeline CRM to fit your business needs, providing flexibility to store the data that matters most. Custom fields can be created for three record types: Company (industry, size, revenue), Deal (product interest, sales forecasts), and Person (birthdays, hobbies, personalized information). Custom field values can be read and written via the API.

### Web-to-Leads

Integrate website forms via Web-to-Leads. This feature allows pushing leads from an external website form directly into Pipeline CRM using a dedicated Web-to-Lead ID (W2LID). A W2LID is available per user alongside the API Key.

### User Management

Retrieve and manage user information within the CRM account. Users can be assigned to deals, people, and companies as owners.

### Search and Filtering

Search and filter CRM data with flexible endpoints. Records can be queried with various filter parameters to retrieve specific subsets of deals, people, or companies.

## Events

The provider does not support webhooks or native event subscription mechanisms through its own API. Real-time event-driven integrations with Pipeline CRM are typically achieved through third-party platforms such as Zapier, which provide trigger-based polling for events like new deals, updated deal statuses, new people, and new companies.
