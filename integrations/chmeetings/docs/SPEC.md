# ChMeetings Integration Specification

## Authentication

Use an API key generated under Settings > Integrations > API Integration. Requests use the `apikey` header and `https://api.chmeetings.com/api/v1`. Changing the key invalidates connections using its previous value.

## Supported workflows

- Discover authorized churches and ministries with `list_organizations`.
- Search, retrieve, create, update, and delete people. Search uses the documented name, mobile, and email filters and can expand families, custom fields, organizations, and groups.
- List, create, update, and delete public profile notes.
- List and create families, discover roles, and add, replace, remove, or update family membership.
- List groups, retrieve their members, and add or remove people from groups.
- List, create, and delete contributions; list campaigns and their pledges. Creation sends a nested person, fund allocations, payment method, batch number or ID, note, and optional unique reference. `transactionId` remains a compatibility alias for that reference.
- List events, occurrences, and occurrence attendance. Date ranges are limited to 366 days. Attendance can be filtered by status or group membership.

## Provider contracts

Paged responses expose `paging.page`, `paging.page_size`, and `paging.total_count`; tools return these as `page`, `pageSize`, and `total`. Provider HTTP failures and response-level `status_code`/`errors` become user-facing errors.

Person PUT is a full replacement. Updates first retrieve the person, retain documented writable fields exposed by that response, merge supplied fields and address details, send the replacement, and retrieve the updated person. Fields hidden from the read response and concurrent edits cannot be preserved by this sequence. Person creation can return no response record; in that case the result confirms creation without inventing an ID.

Family member requests use `family_role`; omitted tool roles default to Other. People do not accept an envelope number, and contribution creation does not accept a check number. These legacy input fields are retained but rejected with guidance when provided.

The official endpoint inventory does not expose a suitable current-user/profile identity endpoint. No identity endpoint is invented. No triggers are registered by this integration.

## Official references

- [API reference](https://api.chmeetings.com/scalar/)
- [OpenAPI specification](https://api.chmeetings.com/openapi/v1.json)
- [Developer API guide](https://help.chmeetings.com/hc/en-us/articles/4407466673937-Developer-API-Guide)
