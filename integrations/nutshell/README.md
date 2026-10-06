# Nutshell

Manage contacts, companies, leads, activities, tasks, and notes in Nutshell CRM.
The integration exposes 27 tools, including identity, pipeline and field discovery,
record search, timelines, and revision-aware deletion.

Connect using a Nutshell user email or company domain and an API key from
**Setup > API Keys**. The key must allow API access. Its impersonation settings
and the effective user's permissions determine which records and operations are
available. API access is documented for all Nutshell plans; account permissions
and enabled workflows still apply.

The existing tools use the supported JSON-RPC API and integer API IDs. A displayed
lead number is not the lead's API ID. Custom-field discovery uses the current REST
API, whose field identifiers are strings; use field names as keys in the existing
create/update tools. Contact `title` refers to the custom field named `Job Title`.

Find tools use one-based pages and return a page count, not a total. Contacts,
companies, and activities accept at most 100 results per page; full lead responses
also have a 100-result limit. Product/source name searches accept a maximum match
count and only page 1. Omit the search query to use ordinary list pagination.

Updates fetch the current revision when omitted. Supplied email, phone, address,
and relationship lists replace their existing values. Lead status codes are
0=open, 1=pending, 10=won, 11=lost, and 12=canceled. Closing uses a configured outcome;
provide `outcomeId` when more than one matching outcome exists. Tasks require a title;
when omitted, their existing `description` also supplies the title. A task accepts
at most one related lead. New activities support scheduled or logged status and
store activity notes as log notes.

Deletion requires an exact current revision and confirms the provider's boolean
result. It may remove related CRM data. Read and verify the target before deleting.
Lead creation attaches the default sales process, and writes can trigger configured
automations or notifications. Use a dedicated test instance for automated checks.

The tools return CRM data and identifiers, excluding authenticated avatar URLs,
file transport fields, and user credentials. No file upload/download or outreach,
merge, user provisioning, or workflow configuration tools are included.
