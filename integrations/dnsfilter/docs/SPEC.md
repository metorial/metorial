# DNSFilter specification

DNSFilter provides DNS security, content filtering, threat protection, and network visibility for organizations and managed service providers.

## Authentication

Use a DNSFilter API key created under Account Settings > Security > API Keys. The key inherits its user's permissions. Send the API key itself as the `Authorization` header value. Keys can expire or be revoked; replace the connection's key when necessary.

The REST API base URL is `https://api.dnsfilter.com/v1`.

## Tools

| Workflow | Tool keys |
| --- | --- |
| Authenticated identity | `get_current_user` |
| Organizations | `list_organizations`, `get_organization`, `create_organization`, `update_organization` |
| Filtering policies | `list_policies`, `get_policy`, `manage_policy`, `manage_scheduled_policy` |
| Network sites | `list_networks`, `get_network`, `manage_network`, `manage_network_secret_key`, `manage_ip_addresses` |
| Roaming clients | `list_roaming_clients`, `manage_roaming_client` |
| Users and collections | `manage_organization_users`, `manage_collection`, `manage_collection_users` |
| Block pages | `manage_block_page` |
| Domain classification | `lookup_domain`, `suggest_domain_categorization`, `list_categories` |
| Device identification | `manage_mac_addresses` |
| Reporting | `get_traffic_report`, `get_query_log` |
| Billing | `get_billing` |

Call `list_organizations`, `list_networks`, `list_policies`, and `list_categories` to discover resource IDs before configuring those resources. An MSP network listing requires an organization ID. Organization users use the roles `administrator` and `read_only`; the existing `admin` input is also accepted.

Roaming clients use the `/user_agents` API resources. The `page` and `perPage` inputs become `page[number]` and `page[size]` query parameters.

Policy writes send `whitelist_domains`, `blacklist_domains`, `blacklist_categories`, and `block_applications`. Network policy assignments send `policy_ids`. IP and MAC address writes use `address`. Advanced documented fields remain available through the corresponding tool's `attributes` input.

`get_traffic_report` retrieves total request counts from `/traffic_reports/total_requests`. `get_query_log` retrieves `/traffic_reports/query_logs`. Date bounds map to `from` and `to`; site and roaming-client inputs map to the provider's network and agent filters. Query-log pagination and additional report filters can be supplied through `filters` using provider field names.

Threat suggestions send the domain as `fqdn` and require explanatory notes. Optional category IDs come from `list_categories`; a supplied threat type is included in the notes.

Scheduled policies accept the provider's full weekly `policy_ids` schedule, `organization_id`, `name`, and `timezone` through `attributes`. The documented weekly representation contains 672 fifteen-minute slots. The retained `startTime`, `endTime`, `days`, and roaming-client `autoUpdate` convenience fields are legacy fields whose acceptance is not confirmed by the current API contract.

The current published contract omits top-level collection management and category-suggestion endpoints. Those existing tools remain available for compatibility; their availability requires account-specific verification.

## Sources

- [Current API reference](https://api.dnsfilter.com/docs)
- [Official OpenAPI contract](https://api.dnsfilter.com/docs/api.json) — version `2026-10-07`
- [API keys](https://help.dnsfilter.com/hc/en-us/articles/21169189058323-API-Keys)
