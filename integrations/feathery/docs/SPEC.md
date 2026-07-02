# Slates Specification for Feathery

## Overview

Feathery is a form builder and data intake automation platform that provides tools for creating forms, collecting submissions, generating and signing documents, and extracting data from documents using AI. It offers a REST API for managing forms, users, submissions, document templates, document intelligence (AI extraction), and white-label workspaces.

## Authentication

Feathery uses API key-based authentication. Provide your Feathery admin API key to authenticate access. You can get an API key by creating an account.

API keys are environment-specific (production, development, etc.), which allows you to separate real from test data. All API keys have access to the same fields and forms, but users are environment-specific.

Include the API key as a request header in the format:

```
Authorization: Token <API KEY>
```

The API key can be found in the account settings of your Feathery dashboard.

The base URL depends on the region your account is hosted in:

| Region       | Base URL                     |
| ------------ | ---------------------------- |
| US (default) | `https://api.feathery.io`    |
| Canada       | `https://api-ca.feathery.io` |
| Europe       | `https://api-eu.feathery.io` |
| Australia    | `https://api-au.feathery.io` |

API keys can be rotated via the API, which returns the old and new key.

## Features

### Form Management

Create, list, retrieve, update, copy, and delete forms. Forms can be created from template forms, with the ability to customize steps, fields, text elements, buttons, images, navigation rules, and logic rules. Forms can be enabled/disabled, renamed, and tagged. Translations can be configured for internationalization.

### Form Submissions

Create, update, and list form submissions. Submissions are associated with users and can include field values, completion status, and document generation. Submissions can be searched by field values, time ranges, completion status, and fuzzy search with trigram similarity scoring. Submissions can be exported as PDFs.

### User Management

Create, list, retrieve, and delete users (form submitters). Each user has a unique ID and can have data across multiple forms. You can list all field data for a specific user and retrieve their form session progress, including which step they are on and whether they have completed forms.

### Document Intelligence (AI Extraction)

Extract structured data from uploaded documents using AI. Extractions must be pre-configured in the Feathery dashboard. You can submit files for extraction and list extraction runs with their results, approval status, and extracted data points.

### Document Templates

Fill and sign document templates (PDF, DOCX, XLSX) with field values via API. Documents can be routed to specified email addresses for signature. You can list document templates (filterable by name and tags), list generated document envelopes (filled documents), and track their view/sign status.

### Account Management

Retrieve account information, invite new team members with specific roles (admin, editor, viewer) and granular permissions (edit form results, invite collaborators, edit logic, edit themes, etc.), edit account settings, and remove accounts from a team.

### White-Label Workspaces

Create and manage isolated workspaces for white-labeling. Workspaces support custom branding (logo, colors, favicon, brand name), feature limits (live forms, submissions), restricted UI tabs/elements/integrations, and arbitrary metadata. You can generate JWT login tokens for workspace accounts and populate workspaces with template forms.

### Hidden Fields

Create and list hidden fields that store data not visible on forms but accessible via the API and integrations.

### Logs

Access recent logs for API connector errors, emails sent from forms, forwarded AI extraction emails, email delivery issues (bounces/complaints), and Quik integration requests.

## Events

Feathery supports outbound webhooks that can be configured per form.

### Form Completion

Triggered when a form is submitted. Once an existing submission triggers the FormCompletion event, it won't be able to trigger it again.

### Data Received

Triggered anytime a submission receives user data — when a step is submitted, integration is connected, data is set programmatically, etc. The webhook payload includes the step ID that was submitted.

### File Upload / Document Signed

Triggered when a file is uploaded to the form or a document is signed.

### Integration Connected

Triggered when an integration is connected (e.g., Plaid).

**Webhook Configuration:**

- Webhooks are configured per form, either through the dashboard or via the Update Form API.
- Separate URLs can be specified for production (`webhook`) and test (`test_webhook`) environments.
- Custom headers can be added to webhook requests.
- The trigger type (`data_received` or `form_completion`) is configurable.
- The webhook payload includes a key-value mapping of submitted field values, the user ID (`feathery_user_id`), the step ID if triggered by data received (`feathery_step_id`), and field metadata details.
