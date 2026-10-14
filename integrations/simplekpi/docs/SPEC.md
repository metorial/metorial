# SimpleKPI Classic API Specification

This integration uses the supported SimpleKPI Classic Developer API. The newer
SimpleKPI AI API uses a different host, Bearer API keys, and resource model; it
is not interchangeable with existing Classic connections.

## Authentication and setup

Configure the account subdomain from `https://{subdomain}.simplekpi.com` and use
HTTP Basic authentication with the account email address and Developer API token.
Enable API access under Settings > Developer API. The Classic Individual plan
does not include API access. Requests use JSON over HTTPS at
`https://{subdomain}.simplekpi.com/api`.

## Capabilities

- List, read, create, update, and delete KPIs and users.
- List raw KPI entries, read an entry by ID, record or update an entry by user
  ID or email, load up to 5,000 entries in a batch, and delete an entry.
- List, assign, update, and remove user KPI assignments, including target overrides.
- Manage categories, groups, group items, user group membership, and KPI units.
- Discover available KPI units, frequencies, and icons.
- Query processed report rows, including calculated KPI values, with date, KPI,
  user, and group item filters.

## Requests and results

The tools expose camelCase fields and map them to the Classic API's documented
wire fields. Numeric schemas retain the existing number type. Entry writes must
identify an active user by exactly one of user ID or email and use an active,
non-calculated KPI assigned to that user. Notes are limited to 500 characters.

Entry list queries use `userid`, `kpiid`, `dateFrom`, `dateTo`, `rows`, and `page`.
Dates default to today when omitted. Request at most 500 rows per page and fetch
the next page when a page is full. Reports use comma-separated ID lists and
return at most 10,000 rows, without a documented pagination parameter.

Update tools retain optional fields. They read the resource, merge only supplied
changes with its current writable fields, and send the resulting PUT body. Null
targets, zero values, and false booleans are preserved. This is not an atomic
update; concurrent writes can overwrite one another. Calculated KPIs must be
changed through the product interface.

The Classic API documents rate limits using HTTP 403 and `Retry-After`, as well
as server failures. Tool errors retain the upstream status and include guidance.
Unexpected collection/object response shapes fail instead of producing empty
success results.

## Official references

- [Overview and authentication](https://support.simplekpi.com/Developers)
- [KPIs](https://support.simplekpi.com/Developers/KPIs)
- [KPI entries](https://support.simplekpi.com/Developers/KPIEntries)
- [Users](https://support.simplekpi.com/Developers/Users)
- [User KPIs](https://support.simplekpi.com/Developers/UsersKPIs)
- [User group items](https://support.simplekpi.com/Developers/UsersGroupItems)
- [Groups](https://support.simplekpi.com/Developers/Groups)
- [Group items](https://support.simplekpi.com/Developers/GroupsGroupItems)
- [Categories](https://support.simplekpi.com/Developers/KPICategories)
- [KPI units](https://support.simplekpi.com/Developers/KPIUnits)
- [Frequencies](https://support.simplekpi.com/Developers/KPIFrequencies)
- [Icons](https://support.simplekpi.com/Developers/KPIIcons)
- [Reports](https://support.simplekpi.com/Developers/Reports)
- [Classic and AI API differences](https://support.simplekpi.com/ai-core/api/migrating)
