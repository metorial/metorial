# Slates Specification for ActiveCampaign

## Overview

ActiveCampaign is a cloud-based marketing automation and CRM platform for small-to-mid-sized businesses. It offers solutions for customer experience automation, including email marketing, marketing automation, sales automation, and CRM.

## Authentication

ActiveCampaign uses **API Key** authentication for its REST API (v3).

All requests to the API are authenticated by providing your API key. The API key should be provided as an HTTP header named `Api-Token`.

Each request must also be sent to your account-specific API URL. To enable an integration, you need to obtain your API URL and Key. The API URL and Key can be considered your username and password, which third-party apps can use to access your ActiveCampaign account.

**How to obtain credentials:**

Your API URL and Key are located on the Developer Settings page: Click "Settings" (gear icon), the Account Settings menu will appear, click the "Developer" option, and copy your API URL and Key.

**Base URL format:** `https://{yourAccountName}.api-us1.com/api/3/`

**Header:** `Api-Token: {your_api_key}`

Each user in your ActiveCampaign account has their own API URL and Key.

## Features

### Contact Management

Create, update, delete, search, and sync contacts. Contacts can be associated with accounts, tags, lists, custom fields, notes, and automations. Supports bulk import of contacts. You can retrieve a contact's activity history, bounce logs, geo-IP data, deals, field values, and score values.

### Deal and Pipeline Management

Manage a full sales CRM with deals, pipelines, and stages. Create and update deals with custom field values, notes, tasks, and secondary contacts. Deals can be moved between stages and assigned owners. Pipelines can be configured with multiple stages and deal roles.

### Campaign and Messaging

Create, edit, duplicate, and list email campaigns. Manage email messages and campaign templates. Retrieve campaign links and performance data. Supports template variables for personalization.

### List Management

Create and manage contact lists. Subscribe or unsubscribe contacts from lists. Configure list group permissions.

### Automation Management

List and retrieve automations. Add or remove contacts from automations. View automation entry counts for contacts.

### Tags

Create, update, delete, and list tags. Add or remove tags from contacts.

### Custom Objects

Define custom object schemas with custom fields, and manage records within those schemas. Supports parent-child schema relationships, and records can be created, updated, or deleted by ID or external ID.

### Custom Fields

Define and manage custom fields for contacts, accounts, and deals. Supports field groups, field options, and associating fields with specific lists.

### Accounts (Companies)

Create and manage company/organization accounts. Associate contacts with accounts. Supports custom account fields and notes.

### Forms

Create, update, retrieve, and delete forms. Configure form opt-in settings.

### Segments

Create and manage contact segments with flexible conditions. Run match-all or match-one requests against segments. Track segment count history and revert to historic definitions.

### Event and Site Tracking

Track custom events for contacts that can trigger automations and personalize campaigns. Enable site tracking to monitor visitor behavior on whitelisted domains.

### E-Commerce (Deep Data)

Manage e-commerce connections, customers, orders, order products, and abandoned carts. ActiveCampaign provides both REST and GraphQL APIs, with REST being the primary API for most functionality and GraphQL focused on ecommerce data.

### Tasks and Task Types

Create and manage tasks associated with deals or contacts. Define task types, outcomes, and reminders.

### Users and Groups

Manage users and user groups within the account, including group-level permissions and limits.

### Saved Responses

Create and manage reusable saved response templates.

### Scores

Retrieve and list contact and deal scoring configurations.

### SMS Broadcasts

Create, update, and send SMS broadcast messages. Retrieve broadcast metrics, recipients, failures, and credit usage. Supports AI-generated broadcast content.

### WhatsApp Messaging

List and manage WhatsApp message templates. Send WhatsApp template messages. Manage WhatsApp conversation flows and conversations.

## Events

Webhooks provide the ability to receive real-time data updates about your contact and campaign activity. Choose to receive data based on certain actions (subscribes, unsubscribes, reads, etc.) and have all applicable data sent to a URL of your choice.

Webhooks can be created programmatically via the API or through the ActiveCampaign UI. Each webhook can subscribe to multiple events and can be filtered by initiation source.

**Source Filtering:** Sources include public (triggered by contacts), admin (triggered by users), api (triggered by API calls), and system (triggered by automated processes). You can select one or more sources per webhook.

**Optionally filter by list:** Webhooks can be scoped to a specific list or apply to all lists.

### Contact Events

- **subscribe** — Contact subscribes to a list.
- **unsubscribe** — Contact unsubscribes from a list.
- **update** — Contact record is updated.
- **contact_tag_added** — A tag is added to a contact.
- **contact_tag_removed** — A tag is removed from a contact.
- **subscriber_note** — A note is added to a contact.
- **list_add** — A contact is added to a list.

### Campaign Events

- **sent** — A campaign is sent.
- **open** — A contact opens a campaign email.
- **click** — A contact clicks a link in a campaign email.
- **reply** — A contact replies to a campaign email.
- **forward** — A contact forwards a campaign email.
- **share** — A contact shares a campaign email.
- **bounce** — A campaign email bounces.

### Deal Events

- **deal_add** — A deal is created.
- **deal_update** — A deal is updated.
- **deal_note_add** — A note is added to a deal.
- **deal_task_add** — A task is added to a deal.
- **deal_task_complete** — A deal task is completed.
- **deal_tasktype_add** — A deal task type is added.
- **deal_pipeline_add** — A deal is added to a pipeline.
- **deal_stage_add** — A deal is added to a stage.

### SMS Events

- **sms_sent** — An SMS message is sent.
- **sms_reply** — A contact replies to an SMS.
- **sms_unsub** — A contact unsubscribes from SMS.

Custom object webhooks are also available to post data when an action occurs with a custom object, including custom objects imported from a supported third-party integration and custom objects created using the API.

Note: Contact-added webhooks will not fire during mass inserts such as contact imports. Campaigns triggered by events, such as autoresponder campaigns and automation-driven campaigns, will not trigger webhooks.
