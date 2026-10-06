# Pingdom integration

Uses the public Pingdom API 3.1 at https://api.pingdom.com/api/3.1. Official reference: https://docs.pingdom.com/api/.

Connect with an API token generated in My Pingdom → Integrations → The Pingdom API. Read-only tokens support inspection; creating, updating or deleting resources requires Read/Write access. Optional account owner email remains available for legacy delegated enterprise connections.

Manage uptime checks, scripted transaction checks, alerting contacts and teams, and maintenance windows. Inspect check results, performance summaries, alert action history, probe servers, credits and root cause analysis. For HTTP basic authentication, username and password set the target credentials together. Empty recipient lists clear notification assignments; omitted fields preserve existing values during updates.

Checks can send network traffic and notifications. Use paused uptime checks or inactive transaction checks when preparing a configuration. Deleting a check permanently removes its monitoring history. Maintenance applies only to selected check IDs. Contact and team updates read the existing configuration before preserving omitted fields. Concurrent changes to those resources can still race with an update.

Lists return one page and expose the number of records returned. Provider totals are included only when Pingdom supplies them. Credits do not provide separate remaining uptime and transaction capacities, so the legacy fields for those capacities remain optional and unset. The API does not expose a suitable current-user identity endpoint.

UDP checks require a port; send and expected payload strings are optional. Transaction detail reads require actual name/state fields, normalize tags consistently, and reject a conflicting returned identifier. Transaction updates read back the requested check before returning its current state. Upstream errors retain their status while avoiding raw credential-bearing parent details.

No event triggers are registered. No downloadable file endpoint is exposed by these tools.
