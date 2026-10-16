# Daffy API Integration

Daffy provides a donor-advised fund for charitable giving. This integration uses
the public API at `https://public.daffy.org/v1`.

## Authentication

Use a Daffy API key in the `X-Api-Key` header. Connection verification retrieves
the authenticated user's profile. No additional configuration is required.
The [authentication guide](https://docs.daffy.org/auth) describes key creation
and revocation. OAuth configuration is outside the documented public API
authentication contract and is not implemented here.

## Supported workflows

| Capability | Tools | Official reference |
| --- | --- | --- |
| Current identity and public profiles | `get_user_profile`; omit `username` for the authenticated user | [Users](https://docs.daffy.org/ref/users) |
| Fund balance | `get_fund_balance` | [Balance](https://docs.daffy.org/ref/balance) |
| A user's charitable causes | `get_causes`; discover `userId` through `get_user_profile` | [Causes](https://docs.daffy.org/ref/causes) |
| Contribution history | `list_contributions` | [Contributions](https://docs.daffy.org/ref/contributions) |
| Donation history, details, creation, cancellation | `list_donations`, `get_donation`, `create_donation`, `cancel_donation` | [Donations](https://docs.daffy.org/ref/donations) |
| Charity gift creation and tracking | `create_gift`, `list_gifts`, `get_gift` | [Gifts](https://docs.daffy.org/ref/gifts) |
| Nonprofit discovery and details | `search_nonprofits`, `get_nonprofit` | [Nonprofits](https://docs.daffy.org/ref/non_profits) |

### Donation behavior

`get_donation` accepts a donation ID and an optional donor user ID. When the user
ID is omitted, it resolves the authenticated user before requesting the donation.
Other donors' records are limited to public donations. Hidden amounts are
omitted; optional donor/fund metadata is retained when present.

Creation sends the nonprofit EIN, amount, optional public note, and optional
private memo. The public API reference specifies a $10 minimum. Cancellation
applies only to the authenticated user's donations that Daffy has not accepted
or rejected. The API does not document donation updates.

### Contributions and gifts

The API can return null receipt/completion timestamps. The corresponding tool
fields are omitted until the timestamps are available, preserving their string
type. Frequency is returned when included. Creating a gift requires at least $18 in whole dollars, consistent
with the [official CLI guidance](https://docs.daffy.org/agents/cli).
The public API documents gift creation and reads, rather than gift editing or
cancellation.

### Pagination and errors

List tools expose `totalCount`, `currentPage`, and `lastPage` from the provider's
pagination metadata. Request another positive integer `page` until `currentPage`
equals `lastPage`. See [Pagination](https://docs.daffy.org/ref/pagination).
Invalid identifiers, page numbers, empty credentials, unsupported amounts, and
upstream failures produce structured service errors.

## Boundaries

The public reference does not document contribution creation, tax receipt exports,
portfolio changes, account edits, or webhook registration. Those capabilities are
not inferred from Daffy's product UI or private partner APIs.

## Verification

The refresh is checked with a focused package build and static schema review.
No live provider requests, E2E suites, or tool-use evaluations were run. Live
provider behavior and account-specific permissions remain unverified.
