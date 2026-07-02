# <img src="https://provider-logos.metorial-cdn.com/activecampaign.png" height="20"> Activecampaign

Manage contacts, deals, and marketing automation for customer experience. Create, update, search, and sync contacts with tags, lists, custom fields, and notes. Build and manage sales pipelines with deals, stages, tasks, and custom fields. Create and send email campaigns with templates and personalization. Subscribe and unsubscribe contacts from lists. Add or remove contacts from automations. Track custom events and site visitor behavior. Manage e-commerce data including orders, customers, and abandoned carts. Send SMS broadcasts and WhatsApp template messages. Define custom object schemas and manage records. Create and manage segments with flexible conditions. Configure webhooks for real-time updates on contact, campaign, deal, and SMS activity.

## Tools

### Create Note

Creates a note on a contact, deal, or account. Specify the resource type and ID along with the note content.

### Create or Update Account

Creates a new company/organization account or updates an existing one. Accounts can be associated with contacts and deals. Supports custom fields.

### Create or Update Contact

Creates a new contact or updates an existing one using ActiveCampaign's sync endpoint. If a contact with the given email already exists, it will be updated with the provided fields. Otherwise, a new contact is created. Supports setting custom field values.

### Create or Update Deal

Creates a new deal or updates an existing one. When creating, provide title, contactId, pipelineId, and stageId at minimum. When updating, provide the dealId and only the fields you want to change. The value is in cents (e.g., 10000 = $100.00).

### Create or Update Task

Creates a new task or updates an existing one. Tasks are typically associated with deals. Supports setting title, due date, task type, assignee, and status.

### Delete Contact

Permanently deletes a contact from ActiveCampaign. This removes the contact and all associated data.

### Delete Deal

Permanently deletes a deal from ActiveCampaign.

### Get Contact

Retrieves a contact's full details including custom field values, tags, list subscriptions, and deal associations. Can look up by contact ID or search by email.

### Get Deal

Retrieves the full details of a deal by its ID, including associated contact, pipeline, stage, and custom fields.

### List Automations

Lists all available automations with their names, statuses, and entry counts. Use this to find automation IDs for adding or removing contacts.

### List Campaigns

Lists email campaigns with optional pagination. Returns campaign names, types, send dates, and status information.

### List Custom Fields

Lists custom field definitions for contacts, deals, or accounts. Use this to discover field IDs and types before setting custom field values.

### List Pipelines and Stages

Lists all deal pipelines and their stages. Useful for finding pipeline and stage IDs needed when creating or updating deals.

### Manage Contact Automation

Adds a contact to an automation or removes them from one. When removing, provide the contactAutomation ID (available from Get Contact).

### Manage Contact Tags

Adds or removes tags from a contact. Use the action field to specify whether to add or remove tags. When removing, provide the contactTag IDs (not tag IDs) — these can be obtained from the Get Contact tool.

### Manage List Subscription

Subscribes or unsubscribes a contact to/from a mailing list. Status 1 subscribes the contact and status 2 unsubscribes them.

### Manage Lists

Creates, updates, deletes, or retrieves mailing lists. Lists are used for organizing contacts and sending campaigns. To subscribe/unsubscribe contacts from lists, use the Manage List Subscription tool.

### Manage Tags

Creates, updates, deletes, or lists tags. Tags can be of type "contact" or "template". Use this to manage tag definitions — to add/remove tags from contacts, use the Manage Contact Tags tool instead.

### Search Accounts

Searches and lists company/organization accounts. Supports text search and pagination.

### Search Contacts

Searches and lists contacts with optional filters for email, list, tag, and status. Supports pagination and free-text search across contact fields.

### Search Deals

Lists and filters deals across pipelines. Supports filtering by pipeline, stage, status, owner, and contact. Use for browsing deals or finding specific ones.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
