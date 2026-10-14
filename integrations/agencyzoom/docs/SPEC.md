# AgencyZoom Integration

The integration exposes 33 tools for insurance CRM workflows: lead and quote management, customers and notes, policies, tasks, opportunities with drivers and vehicles, service tickets, reference data, customer AMS policies, and sales summaries.

## Authentication

Username/password authentication calls `/v1/api/auth/login` with `version: 2`, reads `jwt`, and persists token expiry and the rotating refresh token. Renewal calls `/v1/api/auth/refresh`; a legacy connection without a refresh token can sign in again using its stored credentials. Policy creation also requires an `X-Api-Token` connection credential. The existing API-key/secret method is retained, with REST authorization unverified.

## Compatibility

All 30 original tool keys and existing input/output field types, enums, meanings, and optionality are retained. Newly exposed provider-required inputs are optional in schemas. Missing provider-required values produce actionable errors. Search summaries normalize numeric IDs to strings while record outputs retain provider data.

Lead field updates read the current record before sending the provider's replacement update. Opportunity, quote, driver, vehicle, and ticket updates retain available existing values. These reads and writes are separate operations; concurrent edits can race.

## Limitations

- Some provider read/write schemas conflict or omit fields. Partial-update preservation depends on the values returned by the provider.
- Direct lead status transitions document fewer statuses than lead search. Existing statuses remain available; provider acceptance must be verified live.
- Task activity filtering uses returned activity data rather than the provider's distinct sales/onboarding search category. It fails clearly if activity data is absent.
- Locally filtered searches stop with an error after 100 API pages instead of returning an incomplete count.
- Supply `customerId` to `delete_policy` for the documented customer-policy route. The legacy policy-only route remains available and unverified.
- Some legacy commercial-customer fields and policy category fields have no established wire mapping in current documentation and remain forwarded for compatibility.
- No documented read-only current-user endpoint was found; the published profile endpoint updates the profile.

## References

- [Official API reference](https://api.agencyzoom.com/openapi/)
- [Alternate official API reference](https://app.agencyzoom.com/openapi/)

No live provider behavior is asserted by this specification.
