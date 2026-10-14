# GetProspect API contract

## Authentication and routing

Connect with an API key from [account settings](https://app.getprospect.com/settings/api).
The current [API v2 authentication contract](https://getprospect.com/api-docs/authentication) uses `https://api.getprospect.com/v2` and an `x-api-key` header. The email tools and account tools use this contract. Blank keys and empty email lookup identifiers produce actionable validation errors. HTTP and v2 envelope failures are reported as service errors.

Legacy lead, company, sequence, step, tag, note, and domain tools retain `https://api.getprospect.com/public/v1`, the `apiKey` header, their existing payloads, tool keys, and output fields. The current public v2 documentation does not document those legacy management endpoints. Their continuing provider support has not been verified, and this refresh does not map legacy CRUD semantics onto search or save endpoints.

## Email tools

- `find_email`: [POST /v2/email/find](https://getprospect.com/api-docs/email-finder), with `data.domain`, `data.first_name`, and `data.last_name`. A 200 response with `success: false` and `NOT_FOUND` is a normal lookup miss. A nullable email is omitted from the optional email output; status and domain health remain available.
- `verify_email`: [POST /v2/email/verify](https://getprospect.com/api-docs/email-verifier), with `data.email`. Returns mailbox status, domain health, mail provider, and whether the email uses a free provider. A 200 envelope containing `VERIFICATION_ERROR` is a service failure with the provider's retry guidance. Syntactically invalid addresses are sent to the provider for its documented free `invalid` verdict.

Both tools retain their existing input names and field types. Their output health fields are additive. The optional `confidence` field on `find_email` remains for compatibility, but API v2 does not document a confidence score. Both clients allow 100 seconds for a request: the provider recommends at least 95 seconds for find and 80 seconds for verify. The client does not automatically retry credit-spending operations.

## Account tools

- `get_current_user`: [GET /v2/me](https://getprospect.com/api-docs/me), returning user ID, email, names, timezone, account creation time, workspace ID/name/role, authentication channel, and API key ID. No secret key is returned. This operation spends no credits.
- `get_credit_balances`: [GET /v2/credits](https://getprospect.com/api-docs/credits), returning available, allowance, additional, and permanent balances for email search, email verification, and phone search, plus the next reset time. This operation spends no credits.

## Practical coverage and limits

The [current API index](https://getprospect.com/api-docs) additionally documents structured people/company search, enrichment, saves, blocklists, jobs, and webhooks. Those features require separate contracts and are outside this targeted refresh. No triggers or downloadable-file tools were added.

This refresh was verified locally by building the integration; no authenticated provider calls, live E2E suites, or tool-use evals were run.
