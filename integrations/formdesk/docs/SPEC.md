Now let me get more details about the Formdesk REST API endpoints and SOAP API:Now I have comprehensive information about Formdesk's API. Let me compile the specification.

# Slates Specification for Formdesk

## Overview

Formdesk is a Dutch online form builder that allows users to create forms such as registration forms, order forms, surveys, and applications. It provides a webservice API (both SOAP and REST) to programmatically manage forms, form submissions (results), visitors, and files. The platform is credit-based, requiring the purchase of API credits for API usage.

## Authentication

Formdesk uses **API Key** authentication via a Bearer token.

- The Bearer token in the Authorization header is the API Key which can be found or created within the User Management in your Formdesk account.
- Within Formdesk, under user management, multiple API keys can be created with associated permissions.
- The API key is passed as a Bearer token in the `Authorization` header: `Authorization: Bearer <api_key>`

**Connection Flow:**

1. The resource URL must have the following format: `https://[host]/api/rest/v1/[folder of forms]/`
2. For the initial Connect call, the host is always `www.formdesk.com`. With all other calls you need to use the host returned by the Connect method, e.g. `fd7.formdesk.com`.
3. The "folder of forms" is also called "domain" — it is the unique account name you can find within your account settings.

The Connect method must be called first to determine the correct server for subsequent API calls. It returns the proper host, domain, and full API URL. An alternative authentication method is also available using **domain**, **username**, and **password** parameters via the Connect method.

**Required credentials:**

- **API Key**: Generated in User Management within the Formdesk account
- **Domain (folder of forms)**: The unique account name
- **Host**: Determined dynamically via the Connect method

## Features

### Form Management

- Retrieve a list of all forms in the account, including form IDs and names.

### Form Result (Submission) Management

- Retrieve lists of form result entry IDs, with extensive filtering by date ranges (created, changed, completed), status, sync status, visitor, and pre-defined views/filters.
- Get detailed individual result entries including all submitted field data and system metadata.
- Add new result entries to a form programmatically, including file uploads (base64-encoded).
- Update existing result entries with new data.
- Remove result entries, optionally removing only associated uploaded files.
- Mark result entries as "processed" to track synchronization state, enabling incremental sync workflows.
- Export form results to various file formats: Excel, XML, CSV, dBase, FoxPro, and plain text.
- Generate and retrieve PDF documents from result entries with configurable paper size, orientation, scaling, margins, and password protection.

### Visitor Management

- Visitors are registered users who can log in to forms that support entry maintenance.
- List, add, update, and remove visitors, including their name, email, username, and password.
- Authenticate visitors by username and password.
- Retrieve all form results associated with a specific visitor across multiple forms.

### Single Sign-On (SSO)

- Sign on users or form visitors without requiring them to enter credentials, enabling SSO integration from external systems.
- Returns a redirect URL with a session token that grants access to Formdesk.

### Form Data Parking

- Push data to Formdesk temporarily and receive a ticket. When the ticket is used to open a form, the form is pre-filled with the parked data.
- Configurable expiration time and options for single/multi-use tickets and preventing field changes.

### File Management

- Retrieve uploaded files associated with form submissions by file name or ID.

### Pre-defined Filters

- Retrieve the list of pre-defined filters (views) configured on a form, which can then be used to filter result queries.

## Events

When a visitor completes and submits a form, the data is sent to the Formdesk database. Formdesk Webhooks allow you to send this data to one or more other systems at the same time.

### Form Submission Webhooks

- Directly submit entered data to one or more other systems using Webhooks.
- Webhooks are configured per form in the form settings. Formdesk supports almost any standard method for exchanging data and offers a number of pre-defined Webhooks with commonly used systems such as Salesforce and Mailchimp.
- Using the Webhook's sending criteria, you can execute them selectively. For example, consider an order form that inquires whether the user would like to receive your newsletter. The Webhooks should then only be executed when the visitor indicates they want to receive the newsletter. Or you can execute the Webhooks only once the completed form is approved in the workflow.
- Sometimes the receiving system sends a reply upon receipt of the data. This could, for example, be a unique ID number that identifies the stored data. These replies can be stored in (hidden) fields within the form.
- Webhooks can include PDF document attachments generated from the form submission.

Note: Webhooks in Formdesk are outbound — they push form submission data to external URLs upon submission. They are configured within the Formdesk UI per form, not via the API.
