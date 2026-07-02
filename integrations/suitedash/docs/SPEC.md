Now let me look at the Zapier integration to understand what API actions are available:Now let me look at the Make.com integration for more detail on available API actions:Now I have enough information to compile the specification.

# Slates Specification for Suitedash

## Overview

SuiteDash is an all-in-one business management platform that combines CRM, client portal, project management, invoicing, file sharing, documents and eSigning, email marketing, support tickets, and a learning management system (LMS) into a single white-labeled platform. It provides a Secure API (REST) for programmatic access to core CRM, project, and marketing data, along with configurable webhooks for event-driven integrations.

## Authentication

SuiteDash uses API key-based authentication via two credentials passed as HTTP headers:

- **X-Public-ID**: A unique public identifier for your SuiteDash account.
- **X-Secret-Key**: A secret key you generate within your account.

To obtain these credentials, navigate to **Integrations > Secure API** in your SuiteDash account. Click the green "Authorize" button and paste your Public ID and one of the Secret Keys you created inside your account.

You can create multiple secret keys by clicking **+ Add Secret Key**, naming each one, and saving. These credentials are found under **Integrations > Secure API**.

Both values must be included as HTTP headers (`X-Public-ID` and `X-Secret-Key`) with every API request.

**Access restrictions**: Only Super Admins and Admins have access to the Secure API. Access can be further restricted to Super Admins only via Platform Branding settings.

**Interactive documentation**: SuiteDash provides a live Swagger-based interactive API documentation at `https://app.suitedash.com/secure-api/swagger` which can be used to explore and test all available endpoints after authorizing with your credentials.

## Features

### Contact Management

Create, retrieve, update, and list contacts in the CRM. The API exposes CRM Company and Contact Custom Fields, allowing full access to custom data schemas unique to your account. Contacts can be assigned roles, associated with companies, and managed with custom field values.

### Company Management

Create, retrieve, update, and list company records. Companies serve as the organizational grouping for contacts. When creating a contact, a company can be automatically created if no exact match exists.

### Project Management

Create, update, and retrieve projects. Project Custom Fields are also accessible through the API's metadata schema. Projects can be associated with contacts and companies.

### Task Management

Create, update, and find tasks. Tasks can be searched by name or ID and are tied to projects.

### Marketing Audiences

Subscribe contacts to Marketing Audiences for targeted email campaigns. The API allows adding contacts to specific marketing audience lists.

### Metadata Retrieval

Retrieve the full schema of custom fields, meta attributes, and marketing audiences configured in your account via the `/contact/meta` endpoint. Once you have the complete schema you can use the GET, POST, and PUSH endpoints to build a complete 2-way data sync.

### Behavior Settings

The API supports configurable behavior for unknown/missing items — you can choose to either fail the request or treat it as successful. The "treat as successful" option is recommended when integrating with automation tools to prevent false failures.

## Events

SuiteDash supports webhooks in two categories: dedicated Billing and Project webhooks configured through the UI, and general-purpose automation webhooks.

### Billing Webhooks

Billing webhooks can be enabled under Integrations > Webhooks > Billing. Available events:

- **Subscription Created** — fires when a new subscription is created.
- **Subscription Canceled** — fires when a subscription is canceled.
- **Subscription Expired** — fires when a subscription expires.
- **Subscription Unpaid** — fires when a subscription becomes unpaid.

Each webhook allows you to toggle which data fields are included in the payload, and you can reorder the fields. Multiple endpoint URLs can be configured per webhook event.

### Project Webhooks

Project webhooks can be enabled under Integrations > Webhooks > Projects. Available events:

- **Project Created** — fires when a new project is created.
- **Project Updated** — fires when a project is updated.
- **Project Deleted** — fires when a project is deleted.

Similar to billing webhooks, you can customize which data fields are sent and their order in the payload.

### Automation Webhooks

Automations can fire a webhook to your endpoint. A webhook notification is a message indicating that a specific event has occurred. When the event occurs, a notification is sent via HTTPS POST to the destination URL of your choice. You can assign any string to be used as an event signifier. These are triggered by SuiteDash's no-code automation engine, which can respond to various internal events (e.g., form submissions, task completions, proposal acceptance). Multiple webhook notifications can be added to a single automation.
