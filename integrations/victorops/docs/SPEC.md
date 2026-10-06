# VictorOps / Splunk On-Call

Splunk On-Call uses the public VictorOps API at `https://api.victorops.com`. The existing integration key remains `victorops`.

## Authentication

An API ID and API key are sent in `X-VO-Api-Id` and `X-VO-Api-Key` headers. Administrators create keys under Integrations > API. Read-only keys support GET operations only. Authentication validates access using the current V2 user list; the organization key does not identify an individual user.

## Supported workflows

- List and read incidents; manually create incidents, acknowledge, resolve and reroute them. Creation and rerouting can page responders. User-wide actions affect every incident paged to that user.
- Create, read, update and delete named JSON incident notes. The original text content input maps to `json_value.content`; updating text preserves other JSON fields.
- Read organization, user and team on-call schedules and team rotations. Request immediate policy-level takeovers; read the roster to confirm coverage.
- List, read, create, update and delete users and teams, including membership and admin reads. Creating a user sends an invitation; deletion requires a replacement user.
- List, read, create, replace steps and delete escalation policies. The original timeout unit is seconds; values must be divisible by 60. `timeoutUnit: minutes` accepts whole provider minutes. Step replacement preserves the current custom paging setting unless explicitly changed. Deleting a policy also removes routing keys targeting only that policy.
- List, create and delete non-default routing keys. Legacy target objects are translated to the provider's policy slug array.
- Read, start and end maintenance mode. An explicitly empty routing-key array mutes the whole organization. Modes persist until ended.
- Search incident history with offset pagination and filters. Totals appear only when supplied by the provider. Legacy phase names are translated to current reporting filters.
- Read shift logs and paginated chat messages; send timeline messages using a registered monitoring-tool identifier. Sent chat and resolved incident history remain on the provider.

## Scope and transport

The 15 established tool keys and their input field types are retained, with incident reads, routing-key deletion and chat reads added. Schedule-day and reporting bounds, and whole-minute policy timeout conversion, are validated at runtime. Incident responses must contain their stable number; detail reads and routing-key responses must match the requested identifier. No event subscriptions are registered. Tools use the production HTTPS origin, a 30-second timeout, encoded resource paths and sanitized service errors with safe HTTP status/retry metadata. Internal multi-request operations pace requests for the documented two-per-second limit. Separate simultaneous invocations can still encounter rate limits; read back uncertain writes before retrying.

## Official sources

- [Splunk On-Call API access](https://help.splunk.com/en/splunk-cloud-platform/alert-and-respond/splunk-on-call/introduction-to-splunk-on-call/splunk-on-call-api)
- [Public API reference](https://portal.victorops.com/public/api-docs.html)
- [Published API definition](https://portal.victorops.com/api-docs/victorops-api-v1.yaml)
