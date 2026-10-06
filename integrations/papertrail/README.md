# <img src="https://provider-logos.metorial-cdn.com/papertrail.png" height="20"> Papertrail

Search centralized logs, inspect senders and log destinations, manage groups and saved searches, retrieve transfer usage, download available log archives, and manage account membership.

## Authentication

Use an API token from your Papertrail user profile. Requests use Papertrail's hosted HTTP API. Permissions follow the token owner's account and group access. The documented usage endpoint verifies the credential but does not expose account identity or plan names.

## Tools

- `search_events`: search retained logs with queries, sender/group scope, Unix-time or event-ID boundaries, bounded pages, and completeness flags. For backward pages use the previous `minId` as `maxId`; for forward pages use the previous `maxId` as `minId`. Continue after empty partial pages until the relevant beginning/end flag. `tail: false` prioritizes completeness.
- `list_systems`, `get_system`, `create_system`, `update_system`, `delete_system`: inspect or manage log senders. Register using a destination ID/port or a static public IP for standard syslog. A destination cannot be changed after registration. Empty hostname/IP strings can clear existing filters.
- `list_groups`, `get_group`, `create_group`, `update_group`, `delete_group`, `manage_group_membership`: manage sender groups and explicit membership. Deleting a group preserves its senders.
- `list_saved_searches`, `get_saved_search`, `create_saved_search`, `update_saved_search`, `delete_saved_search`: manage named queries and group scope. Alerts are configured in Papertrail; deleting a search also removes associated alerts.
- `list_destinations`, `get_destination`: inspect existing log destinations. Papertrail does not support creating or updating destinations through this API.
- `list_users`, `invite_user`, `remove_user`: inspect account membership, invite/grant access, and revoke access. Invitations can send email or immediately grant access to an existing Papertrail user. Membership/billing permissions override read-only access; restricted users cannot purge logs.
- `list_archives`, `download_archive`: discover UTC hourly/daily gzipped TSV archives and prepare a selected available file for download. Access depends on archive availability and account permissions.
- `get_usage`: retrieve current billing-period transfer bytes, plan/hard limits, and usage percentage when supplied. Additional usage may make the percentage exceed 100.
- `get_account_usage`: deprecated because its original account-identity fields are not exposed by the documented API. Use `get_usage`; view account identity and plan details in account settings.

## Limits

Papertrail documents a 1,000-event default and 10,000-event maximum per search, an approximate five-second search time limit, and request-rate limits indicated by response headers. Search results may be partial even when no events match; use returned cursors and completeness flags. Event IDs are decimal strings to preserve 64-bit precision.

See the official [HTTP API](https://www.papertrail.com/help/http-api/), [settings API](https://www.papertrail.com/help/settings-api/), [search API](https://www.papertrail.com/help/search-api/), and [archive guide](https://www.papertrail.com/help/permanent-log-archives/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
