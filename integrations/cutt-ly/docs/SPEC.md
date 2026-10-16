# Cutt.ly API Specification

## Authentication and API selection

API key authentication uses the `key` query parameter. Select the matching
`apiType` connection setting:

- `regular`: personal key from Edit Account; endpoint `https://cutt.ly/api/api.php`.
- `team`: team key from the Team edit page; endpoint `https://cutt.ly/team/API/index.php`.
  Requires a Team subscription.

Keys are non-expiring credentials; no OAuth scopes or token refresh are involved.
No profile, account identity, domain-list, or link-list operation is documented.
Keep the returned short URL for future edits, deletion, and analytics.

## Tools

| Tool | Provider operation |
| --- | --- |
| `shorten_url` | Regular: `short=<url>`; Team: `action=shorten&url=<url>`. Returns the created short URL, destination, title, and creation date. |
| `edit_link` | Regular: `edit=<short-url>`; Team: `action=edit&url=<short-url>`. Changes alias, destination, title, tag, uniqueness, expiration, redirects, or A/B/C testing. |
| `delete_link` | Edit operation with `delete=1`. |
| `get_link_analytics` | Regular: `stats=<short-url>`; Team: `action=stats&url=<short-url>`. Returns click counts, breakdowns, and the complete analytics payload. |
| `remove_mobile_redirect` | Edit operation with `mobile=<platform>` and the `destination` parameter omitted. |

Links managed by these APIs are stored in the account's **API URLs** section;
links created in the dashboard's main link manager cannot be edited or analyzed
through these endpoints.

## Request and response contracts

Shortening succeeds with status `7`. Edit, password, redirect-removal, and delete
operations succeed with top-level status `1`; nested legacy `url.status`
responses are also accepted. Analytics succeeds with `stats.status=1`.
Provider statuses, HTTP failures, invalid responses, and invalid operation
combinations surface as actionable errors.

For personal branded links, `useBrandedDomain=true` sends `userDomain=1` and
uses the active approved account domain. Team links use the optional `domain`
input, which sends the domain name owned by the team. The Team API does not
use the personal `userDomain` flag. Both APIs encode query parameters once,
including URLs containing UTM parameters and deep links.

Password changes send multipart form data by POST with query `password=1`.
An empty password removes protection. Password changes and other edits are
separate requests; a later failure reports that the earlier password change
already succeeded. Invalid combinations are checked before either request.

Expiration uses `expire=0` for click counts and `expire=1` for dates. Nonzero
expiration needs a condition and post-expiration destination. A condition of
`0` removes expiration. Redirect and unique-click expiration edits are sent
even when they are the only fields supplied.

The existing nested `mobileRedirect` input continues requiring a destination.
Use `remove_mobile_redirect` to restore normal routing without supplying one.
Android package IDs and install referrers apply only to Android redirects.

A/B tests need a B percentage and URL; A/B/C tests additionally need C values.
Each percentage must be 0–100 and the B/C total cannot exceed 100. Removing a
test sends only `abtest=0` without stale variation fields.

Analytics supports independent start/end dates in `YYYY-MM-DD` format, subject
to plan eligibility. The normalized fields remain available, with the original
analytics payload under `raw` to preserve additional provider data.

## Plan restrictions and boundaries

Custom domains require an active paid plan and an approved domain. Editing,
passwords, expiration, A/B/C tests, date filtering, and `noTitle` have provider
plan restrictions; unsupported operations fail without automatic retries.
The integration does not expose undocumented listing, identity, webhook,
QR-code, or export endpoints.

## Official references

- [Regular API](https://cutt.ly/api-documentation/cuttly-links-api)
- [Team API](https://cutt.ly/api-documentation/team-api)
- [Developer workflow and API URLs boundary](https://cutt.ly/resources/tools/cuttly-api)
