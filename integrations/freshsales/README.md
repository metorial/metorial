# <img src="https://provider-logos.metorial-cdn.com/freshsales.png" height="20"> Freshsales

Manage leads, contacts, accounts, and deals in Freshsales CRM. Create, view, update, delete, and list leads with lead scoring and conversion to contacts. Manage contacts and associate them with accounts. Track and manage deals through pipelines. Create and manage tasks, appointments, notes, and sales activities. Search across entities using keywords, filter records with saved views, and retrieve activity timelines. Log sales activities such as calls and emails. Manage files and documents on records. Retrieve field metadata and configure custom modules.

## Tools

### Convert Lead

Convert a lead to a contact in Freshsales. Requires the lead's last name and company name for conversion.

### Delete Account

Delete an account (company) from Freshsales by its ID. This action is permanent.

### Delete Appointment

Delete an appointment from Freshsales by its ID.

### Delete Contact

Delete a contact from Freshsales by its ID. This action is permanent.

### Delete Deal

Delete a deal from Freshsales by its ID. This action is permanent.

### Delete Lead

Delete a lead from Freshsales by its ID. This action is permanent and cannot be undone.

### Delete Note

Delete a note from Freshsales by its ID.

### Delete Task

Delete a task from Freshsales by its ID.

### Get Account

Retrieve a single account (company) by ID from Freshsales. Optionally include related contacts, deals, tasks, and more.

### Get Contact

Retrieve a single contact by ID from Freshsales. Optionally include related data like accounts, owner, tasks, appointments, notes, and deals.

### Get Deal

Retrieve a single deal by ID from Freshsales. Optionally include related contacts, account, stage, and activity data.

### Get Fields

Retrieve field metadata for an entity type in Freshsales. Returns all standard and custom fields with their types, labels, and configuration. Useful for discovering custom field keys.

### Get Lead

Retrieve a single lead by ID from Freshsales. Optionally include related data like owner, tasks, appointments, and notes.

### List Accounts

List accounts (companies) from a saved view in Freshsales. Use the **listFilters** tool to get available view IDs.

### List Appointments

List appointments from Freshsales filtered by past or upcoming.

### List Contacts

List contacts from a saved view in Freshsales. Use the **listFilters** tool to get available view IDs. Supports pagination and sorting.

### List Deals

List deals from a saved view in Freshsales. Use the **listFilters** tool to get available view IDs.

### List Filters

List available filter views for an entity type in Freshsales. View IDs returned here are needed for listing records with the **listLeads**, **listContacts**, **listAccounts**, and **listDeals** tools.

### List Leads

List leads from a saved view in Freshsales. Use the **listFilters** tool first to get available view IDs. Supports pagination and sorting.

### List Selectors

Retrieve reference data (selectors) from Freshsales. Use this to get valid IDs for fields like deal stages, pipelines, lead sources, industry types, sales activity types, etc.

### List Tasks

List tasks from Freshsales filtered by status. Returns tasks for the authenticated user only.

### Manage Account

Create, update, or upsert an account (company) in Freshsales. Accounts represent companies with whom you have a business relationship. Use **uniqueIdentifier** to upsert by name or other unique fields.

### Manage Appointment

Create or update an appointment (meeting) in Freshsales. Appointments can be associated with contacts, leads, deals, or accounts.

### Manage Contact

Create, update, or upsert a contact in Freshsales. Supports custom fields and social media profiles. Use **uniqueIdentifier** to upsert by email or other unique fields.

### Manage Deal

Create, update, or upsert a deal in Freshsales. Deals represent sales opportunities and can be associated with contacts and accounts. Manage pipeline stages and expected close dates.

### Manage Lead

Create, update, or upsert a lead in Freshsales. Use this to add new leads, update existing leads by ID, or upsert by a unique identifier like email. Supports custom fields via the **customFields** parameter.

### Manage Note

Create or update a note in Freshsales. Notes can be attached to contacts, leads, accounts, or deals. Supports HTML content.

### Manage Sales Activity

Create or update a sales activity in Freshsales. Sales activities track calls, emails, and custom activities associated with leads, contacts, deals, or accounts. Use the **listSelectors** tool to find valid activity type and outcome IDs.

### Manage Task

Create or update a task in Freshsales. Tasks can be associated with contacts, leads, deals, or accounts using **targetableType** and **targetableId**.

### Search Records

Search across Freshsales entities (contacts, leads, deals, accounts) using keywords or field-specific lookup. Use **keyword** for general search or **lookupField** + **lookupValue** for precise field-based lookups.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
