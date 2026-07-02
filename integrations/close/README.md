# <img src="https://provider-logos.metorial-cdn.com/close.svg" height="20"> Close

Manage leads, contacts, opportunities, and sales pipeline in Close CRM. Create, read, update, and delete leads and contacts with custom fields. Track and log activities including emails, calls, SMS, meetings, notes, and WhatsApp messages. Send emails and manage email threads and templates. Create and manage tasks, opportunities with configurable statuses and pipelines, and email sequences for automated outreach. Search and filter leads with advanced queries and Smart Views. Generate sales reports and exports. Manage custom fields, custom activities, custom objects, scheduling links, connected email accounts, users, roles, and organization settings. Perform bulk operations on leads and other objects. Subscribe to webhooks for real-time event notifications on CRM data changes.

## Tools

### Delete Lead

Delete a lead from Close CRM by its ID. Permanently removes the lead and all associated data including contacts, activities, opportunities, and tasks. This action cannot be undone.

### Get Lead

Retrieves a single lead from Close CRM by ID with full details including contacts, opportunities, and addresses.

### List Activities

List activities in Close CRM with optional filters. Activities include calls, emails, notes, meetings, SMS, and other interaction types logged against leads and contacts.

### List Contacts

List contacts in Close CRM, optionally filtered by lead. Returns paginated results with contact details including name, title, emails, and phones.

### List Leads

Lists and searches leads in Close CRM with optional text query filtering and pagination. Returns a summary of each lead.

### List Opportunities

List opportunities in Close CRM with optional filtering by lead, user, status, and search query. Returns a paginated list of opportunities along with total results and whether more results are available.

### List Pipelines and Statuses

List pipelines, lead statuses, and/or opportunity statuses in Close. Useful for understanding the sales pipeline configuration, looking up status IDs for filtering or updating leads/opportunities, and seeing available pipeline stages.

### List Smart Views

List saved Smart Views (saved search filters) in Close. Smart Views are pre-configured search queries that can be reused. Optionally filter by view type (lead or contact).

### List Users

List users in the Close organization. Useful for looking up user IDs for lead/opportunity assignment, understanding team membership, and finding who is responsible for specific records.

### Manage Contact

Create a new contact or update an existing one in Close CRM. When creating: provide leadId and at least a name. When updating: provide contactId along with any fields to change.

### Manage Email Template

Create or update an email template in Close CRM. If a templateId is provided the existing template is updated; otherwise a new template is created.

### Manage Lead

Creates or updates a lead in Close CRM. If a leadId is provided, the existing lead is updated with the supplied fields. If no leadId is provided, a new lead is created. Supports setting contacts, addresses, and custom fields.

### Manage Note

Create or update a note on a lead in Close CRM. If a noteId is provided the existing note is updated; otherwise a new note is created on the specified lead.

### Manage Opportunity

Create a new opportunity or update an existing one in Close CRM. When creating: provide at least a leadId to associate the opportunity with. When updating: provide the opportunityId along with any fields to change.

### Manage Task

Create a new task or update an existing one in Close CRM. When creating: provide at least a leadId and text for the task. When updating: provide the taskId along with any fields to change.

### Search Leads

Search leads in Close using advanced search/filtering. Uses the POST /data/search/ endpoint which supports complex query objects with boolean logic, field conditions, and nested queries. Useful for finding leads matching specific criteria like status, custom fields, activity dates, etc.

### Send Email

Send an email through Close CRM associated with a lead. Supports sending, drafting, specifying recipients, CC/BCC, and using email templates.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
