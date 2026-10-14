# Tave

Manage leads, contacts, jobs, orders, and payments for photography and creative studios using Tave, now VSCO Workspace. Discover the connected studio, brands, and job types. Create contacts with custom fields, search contacts, and create jobs with existing contacts and scheduled events. List jobs, orders, and payments; filter orders and payments by brand or job type. Create website inquiries through the legacy New Lead API.

Use **API Key (Public API V2)** for all tools except `create_lead`, which uses **New Lead API (Legacy)** credentials. Configure keys under Settings › API Integrations. Read-only keys can use discovery and list tools; creation tools need a read-and-write key.

Call `get_brands` and `get_job_types` to discover exact names and IDs before creating a job or filtering financial records. Custom fields on public API creation tools use configured field IDs, exact names, or tokens. Legacy lead custom fields use the case-sensitive field names or `CF-xxxxx` codes shown in the New Lead API settings.

Contact and financial filters are applied across the relevant API collections before pagination. Large accounts may require many requests. Job creation can create the job, contact link, and event in separate requests; if a later request fails, the error identifies the created job so it can be inspected before retrying.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
