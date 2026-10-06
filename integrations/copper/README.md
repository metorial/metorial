# Copper

Manage people, companies, leads, opportunities, projects, tasks and activities in Copper CRM. Search and update records, convert leads, discover pipelines and metadata, link related records, and identify the connected account and user.

The integration exposes 45 tools on the Copper Developer API v1. API key connections require the key owner's email; OAuth uses the provider's full-access `developer/v1/all` scope. Account and API-user identity are available through `get_profile`.

People, companies, leads, opportunities, projects and tasks each support create, get, update, delete and paged search. `get_person` also looks up a person by email. Additional tools convert leads, log and search activities, discover activity types, pipelines, custom field definitions, contact types, customer sources, loss reasons, users and lead statuses, and read/create/remove record relationships.

Search pages contain at most 200 records and are limited to the first 100,000 matches. Continuation fields indicate when another page may be available or when filters need narrowing. User discovery follows every page within that limit. Dates used in activity/task searches are Unix seconds; opportunity close-date search bounds are Unix seconds encoded as decimal strings. Opportunity close-date values use the account's documented MM/DD/YYYY or DD/MM/YYYY format.

Updates send only supplied fields. Send only custom fields that need changing; an empty Connect field value can remove connections. Deletes and lead conversion are irreversible. Conversion company names can match existing companies; use an existing ID for an exact association or an empty company name to prevent company creation. CRM writes may trigger account automations and notifications.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
