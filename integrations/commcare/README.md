# CommCare

Query, create, update, and close CommCare cases; retrieve submitted forms; manage mobile workers and user groups; and inspect web users, application structure, and fixture reference data.

Use `get_current_user` to identify the connected web user, `list_projects` to discover accessible project spaces, and `bulk_get_cases` to retrieve case IDs or external IDs in one request. Case creation requires a case type, name, and owner ID. Case property values must be strings. `bulk_cases` creates when a case ID is omitted and updates when one is supplied; an external ID alone does not make that tool an upsert.

The JSON Case API cannot reopen a closed case. API-key access and project permissions are required. The existing `send_sms` tool retains its legacy request contract; compatibility of that endpoint with the connected CommCare deployment needs verification.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
