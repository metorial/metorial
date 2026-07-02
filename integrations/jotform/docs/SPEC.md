Now let me get the detailed API endpoint documentation to understand all features:Let me get the full API reference to understand all endpoints:Now I have enough information to write the specification.

# Slates Specification for JotForm

## Overview

JotForm is an online form builder that allows users to create, manage, and collect data using customizable web forms. Jotform API allows you to access your Jotform account, forms and form submissions. Jotform's RESTful API allows pretty much everything. You can access a Jotform account, forms, and form submissions. You can even create and edit forms.

## Authentication

JotForm uses **API Key** authentication. The Jotform API supports more than one authentication method to simplify the authentication process in different programming languages.

### Generating an API Key

Go to Account API, and on the right side of the page, click on Create New Key. Under the Permissions column, click on the Dropdown Arrow icon to change permission: Read Access — Give access to your data in view-only mode, so others can see the information without making any changes. Full Access — This will allow full access to your data—meaning others can add, edit, or delete information as needed.

### Using the API Key

The API key can be provided in two ways:

1. **Query Parameter**: Pass the API key as an `apiKey` parameter in the request URL.
   - Example: `GET https://api.jotform.com/user?apiKey={myApiKey}`

2. **HTTP Header**: Pass the API key as an `APIKEY` header.
   - Example: `curl -H "APIKEY: {myApiKey}" "https://api.jotform.com/user"`

### API Domains

You can access our API through the following URLs: Standard API Usage: Use the default API URL: `https://api.jotform.com`. For EU: Use the EU API URL: `https://eu-api.jotform.com`. For HIPAA: Use the HIPAA API URL: `https://hipaa-api.jotform.com`.

The correct API domain must be selected based on the user's account type and region. Enterprise customers may have custom API domains (e.g., `your-domain.com/API` or `subdomain.jotform.com/API`).

## Features

### Form Management

Create, update, delete, and clone forms programmatically. Submission Handling — Retrieve, update, or delete form responses. You can list all forms in an account, retrieve details of individual forms, get form properties, and manage form questions/fields. Forms can be created programmatically by defining their questions, properties, and email notification settings via the API.

- Forms can be filtered and sorted by creation date, update date, title, or status (ENABLED, DISABLED, DELETED).

### Submission Management

Retrieve, create, update, and delete form submissions. Customize form fields and properties, view form submissions, retrieve submission data, create new submissions programmatically, update existing submissions, delete submissions.

- Submissions can be filtered using various criteria such as date range, status, or custom field values.
- Submissions can be retrieved at the account level (all submissions across forms) or for a specific form.

### User Account Information

Access account details including user profile information, usage statistics, and account settings. Returns number of submissions, number of SSL form submissions, payment form submissions and upload space used by user.

### Folder Management

Get a list of form folders for this account. Returns name of the folder and owner of the folder for shared folders. You can create folders and organize forms within them.

### Sub-user Management

Get a list of sub users for this account. View sub-user accounts and their associated form access privileges.

### Reports

Get reports for all of the forms, ie. Excel, CSV, printable charts, embeddable HTML tables. You can list reports, get report details, and create new reports for specific forms.

### Form Questions

Retrieve and manage individual form fields/questions. You can get a list of all questions on a form, retrieve details for a specific question by its ID, and add or update form questions programmatically. Each question has a type, label, and configurable properties.

- Conditional logic configuration is not accessible via the API.

### Form Properties

Read and update form-level properties such as title, height, styles, thank-you page settings, and email notification configurations.

### Webhook Management

List, create, and delete webhooks on specific forms via the API. Webhooks can be configured programmatically by specifying a URL to receive form submission data.

### File Uploads

Download uploaded files and attachments from submissions. Manage file uploads.

## Events

JotForm supports webhooks that send HTTP POST notifications to a specified URL when certain events occur on a form.

### Form Submission

Webhooks are used to send HTTP post notifications between apps based on certain triggers or events. Using Webhooks, you can instantly send form submission notifications to a specific URL.

- Webhooks are configured per form — each form can have one or more webhook URLs.
- The webhook payload includes the full submission data (all field answers and submission metadata).
- Webhooks can be set up via the Jotform UI (Form Settings > Integrations > Webhooks) or programmatically via the API.
- Webhooks are not triggered when submissions are made via the Jotform API. Webhooks are only triggered when submissions are made using the submit button on the form.

### Workflow Events

This enables seamless automation by triggering actions in other platforms based on specific workflow events — such as form submissions, approvals, or status changes. Webhooks can be configured within JotForm Workflows to fire on workflow-specific events such as approval steps or status transitions.
