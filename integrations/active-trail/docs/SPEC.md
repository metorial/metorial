# Slates Specification for ActiveTrail

## Overview

ActiveTrail is a marketing automation platform for creating, sending, and tracking campaigns via Email, SMS, WhatsApp, and Push Notifications. It provides contact management, group segmentation, automation workflows, e-commerce data tracking, and campaign reporting.

## Authentication

ActiveTrail uses a basic token-based authentication method: add an `Authorization` header to each request with the access token value.

**Obtaining an Access Token:**

Under Settings, on the "API Apps" tab, you can create an Access Token by clicking the "New" button, which opens the "API App" window where you enter details and generate the token. You can create as many Access Tokens as needed, each defined for a different system, and each token may be canceled separately. The system will not re-generate the key again for security reasons, so it must be saved securely upon creation.

**Optional Security Settings:**

- For any given access token, you may define a single or range of authorized IP addresses.
- You can also limit the authorization period and create access tokens whose validity expires on a given date.

**API Base URL:** `https://webapi.mymarketing.co.il/api/`

**Example Request Header:**

```
Authorization: <your_access_token>
Accept: application/json
```

## Features

### Contact Management

Create, update, delete, and retrieve contacts. Import contacts in bulk to groups (up to 1,000 per call). View contact details, subscription status, activity history, bounces, and group/mailing list membership. Filter contacts by status (active, unsubscribed, bounced) and date range. Track subscriber and unsubscriber lists with source attribution.

### Groups and Mailing Lists

Create, update, and delete groups and mailing lists. Add or remove contacts from groups and mailing lists with configurable subscription status. Retrieve group members filtered by status and date. View group-level events such as opens, clicks, and unsubscribes.

### Email Campaigns

Create, edit, design, schedule, and send email campaigns to groups or specific contacts. Campaigns support A/B split testing and e-commerce types. Manage campaign templates, designs, sending settings, and scheduling. Only draft campaigns can be updated.

### SMS Campaigns

Create, send, and manage SMS campaigns and operational SMS messages to groups. View and update campaign details. Estimate message counts for unsent campaigns. Supports two-way SMS with reply retrieval for virtual numbers.

### WhatsApp Campaigns

Send WhatsApp campaigns and operational messages. First-time messages to a contact require an approved template. Free-form content and attachments are only allowed if the contact replied within the prior 24 hours. Manage and retrieve approved WhatsApp templates.

### Push Notification Campaigns

Retrieve push notification campaigns with filtering options.

### Operational Messages

Send transactional/operational email and SMS messages to individual recipients (up to 500 per call). These are one-to-one messages distinct from bulk campaigns. Supports message classification.

### Marketing Automations

Create, edit, design, activate, and deactivate automation workflows. Manage automation triggers (date events, contact updates, etc.), steps (email, SMS, WhatsApp, push notifications, A/B splits, contact updates, social), and flow design. Send test campaigns from automations. Retrieve available trigger types and update actions.

### Campaign and Automation Reporting

Retrieve detailed reports for email campaigns including opens, clicks, bounces, unsubscribes, complaints, and per-domain statistics. Access SMS campaign reports with delivery, click, and failure data. View push notification campaign reports. Get automation-level reports covering email, SMS, WhatsApp, and push notification statistics, as well as contacts who started or completed automations.

### E-Commerce (Commerce)

Add and modify orders and shopping carts associated with contacts. Retrieve order details and order field schemas.

### Sales Lifecycle

Manage leads and opportunities — create, update, and retrieve lead and opportunity records by ID.

### Segmentation

Create and manage segmentations for use in automations. Configure segmentation rules using various field types and operations.

### Signup Forms and Landing Pages

Retrieve signup form details and list all landing pages associated with the account.

### Campaign Templates

Manage reusable email templates stored in "My Templates." Create, update, delete templates and template categories. Create campaigns directly from templates.

### Account Management

View account credit balance (email and SMS), sending profiles, contact field definitions, content categories, and executive reports including contact growth over time.

### External Contact Management

Manage contacts using external IDs and names from third-party systems. Import, map, unmap, update, and delete contacts by external identifiers. Add external contacts to groups and mailing lists. Send operational email and SMS messages to external contacts. Retrieve activity and message statistics.

### Smart Code Sites

Create, update, delete, and list Smart Code tracking sites for your account.

### Social Accounts

View and manage connected social media accounts.

## Events

ActiveTrail supports webhooks that can be configured via the API or through the account settings UI. You can define the parameters and URLs for webhook events covering manual and programmatic contact updates.

### Contact Changes (External/Programmatic)

Triggered when a change is made to a contact's information by some means other than the ActiveTrail user interface — such as via a registration form, API update, landing page, or any other non-manual method.

### Contact Manual Changes

Triggered when a manual change is made to a contact's details via the ActiveTrail web app.

**Configuration Options:**

- Each webhook requires a target URL to receive the callback.
- Custom parameters can be added that will be sent with every call to your API.
- Webhooks can be created, updated, deleted, and tested via the API.
- Webhooks support filtering by event type, state type, and target type.
