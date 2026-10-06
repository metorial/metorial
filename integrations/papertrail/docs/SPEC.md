# Papertrail API capabilities

## Overview

Papertrail (SolarWinds Papertrail) is a cloud-hosted log management service that aggregates logs from applications, servers, network devices, and cloud platforms into a central location. It provides log search, live tailing, system grouping, saved searches, alerting, and permanent log archiving.

## Authentication

Papertrail supports two authentication methods for its HTTP API:

1. **API Token (recommended):** An API token passed in the `X-Papertrail-Token` HTTP header. The token can be found in your Papertrail user profile.

   Example:

   ```
   X-Papertrail-Token: abc123
   ```

2. **HTTP Basic Authentication:** HTTP Basic Authentication using a papertrailapp.com username and password.

The API base URL is `https://papertrailapp.com/api/v1/`.

There are no OAuth scopes or special tenant configurations required. The API token inherits the permissions of the user who owns it.

## Features

### Log Search

Search for log events via the search endpoint. All parameters are optional. You can filter by search query (`q`), limit to a specific system (`system_id`) or group (`group_id`), and constrain results to a time range using `min_time`/`max_time` or `min_id`/`max_id`. A `tail` parameter enables live tail search to continuously retrieve new events. The search query syntax supports Boolean operators (AND, OR), negation, quoted phrases, and attribute-based filters (e.g., `sender:`, `program:`).

### System Management

Manage systems (log senders) registered with your account. The API handles registering systems, changing settings on many systems, and identifying systems that have stopped sending logs. You can list, create, update, and delete systems. Each system can be configured with a name, hostname, IP address, and assigned to a log destination.

### Group Management

Groups are sets of senders (typically systems). Searches can further constrain which log messages are shown, creating a view of only certain messages from the senders in that group. You can create, update, delete groups, and manage group membership by adding or removing systems.

### Saved Searches

Create and manage saved searches within groups. You can create a saved search for a string provided by a user of your app. Saved searches serve as the basis for setting up alerts.

### User Management

Invite new members when a new employee joins the team. Users can be managed via the API, including listing and inviting team members with specific permission levels (full access, read-only, specific group access).

### Log Archives

Archive files can be retrieved using the HTTP API. The URL format is `https://papertrailapp.com/api/v1/archives/YYYY-MM-DD-HH/download`. Current archives are hourly; older available archives may cover UTC days. You can list available archives and download them as gzipped TSV files.

### Account Usage

Retrieve account usage information, such as log volume consumed.

### Log Destinations

Inspect log destinations and their syslog hostname, port, description, and filter. Creating or updating destinations through the settings API is not supported; use Papertrail account settings.


## Supported operations

The integration implements the documented systems, groups, saved-search, membership, log-destination read, usage, archive-list and event-search routes. It adds single-resource reads and authenticated archive downloads. It does not configure alerts or outbound webhooks.

The usage API returns transfer bytes, limits and percentage, not account ID, account name or plan name. `get_usage` exposes these documented values. The original `get_account_usage` contract remains registered and deprecated, and reports an explanatory error instead of inventing account identity.

Official sources: [HTTP API](https://www.papertrail.com/help/http-api/), [settings API](https://www.papertrail.com/help/settings-api/), [search API](https://www.papertrail.com/help/search-api/), [archives](https://www.papertrail.com/help/permanent-log-archives/).
