# <img src="logo.jpeg" height="20"> JobNimbus

Manage contacts, jobs, tasks, notes, estimates, and invoices for service and contracting businesses. Discover account workflows and team members, create and update records, assign tasks, upload contact files, and retrieve filtered activity and financial-document lists.

## Authentication

Create an API key in JobNimbus under **Settings > API** and connect using the API Key authentication method. The key's access profile controls which records and settings it can access. See [JobNimbus API key setup](https://support.jobnimbus.com/how-do-i-create-an-api-key).

## Tools and common workflows

- Contacts: `list_contacts`, `get_contact`, `create_contact`, `update_contact`, and `delete_contact`. Deletion marks the contact inactive.
- Jobs: `list_jobs`, `get_job`, `create_job`, and `update_job`.
- Tasks: `list_tasks`, `get_task`, `create_task`, and `update_task`.
- Notes and history: `create_activity` and `list_activities`.
- Financial documents: `create_estimate`, `create_invoice`, and `list_financial_documents`.
- Contact file upload: `create_file`.
- Discovery: `get_account_settings` returns workflow names, status names, task types, activity types, and lead sources; `list_users` returns user IDs for task owners and sales representatives.

Call `get_account_settings` before creating contacts, jobs, or tasks. Contact creation requires a name or company plus a contact workflow and status. Job creation requires a name, contact ID, job workflow, and status. Task creation requires a title, start timestamp in seconds, and configured task type. Use `list_users` to discover valid assignee IDs.

Estimate and invoice creation require a numeric `status` and at least one `items` entry. Provide `parentRecordType` when associating a financial document with a contact or job. Invoice `dateStart` and `dateEnd` map to invoice and due dates; estimate `dateStart` maps to its estimate date. The estimate endpoint and the base64 file upload endpoint are labeled legacy/deprecated in the provider documentation; these tools retain their existing public keys. Estimate `dateEnd` and financial `recordTypeName` are retained for compatibility, but are not documented fields in the current financial API.

List tools default to 25 records and accept `from` as a non-negative offset and `size` from 1 to 200. Repeat requests with increasing offsets to retrieve more records. For queries exceeding 10,000 records, follow [JobNimbus's filtering guidance](https://support.jobnimbus.com/how-do-i-create-an-integration-using-jobnimbuss-open-api).

## API documentation

The [JobNimbus Open API guide](https://support.jobnimbus.com/how-do-i-create-an-integration-using-jobnimbuss-open-api) links to the [official public API collection](https://documenter.getpostman.com/view/3919598/S11PpG4x). The integration uses the API key's Bearer authentication and the documented `api1` routes, including `v2` estimate and invoice routes.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
