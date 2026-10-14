# EmailListVerify Specification

EmailListVerify verifies mailbox deliverability, enriches email metadata, finds candidate business addresses, and processes bulk email lists.

## Authentication

Use an API key from the dashboard's API section. The current production API base is `https://api.emaillistverify.com/api`. Requests authenticate using the `x-api-key` header; the provider also accepts a `secret` query parameter.

## Tools

- `verify_email`: GET `/verifyEmail` returns a plain-text deliverability result. Insufficient credits are reported as an error rather than a deliverability result.
- `enrich_email`: GET `/verifyEmailDetailed` maps `result` to status, combines `firstName` and `lastName` into fullName, and exposes `esp`, `isFree`, and `isNoReply`.
- `find_email` and `domain_search`: POST `/findContact` accepts a JSON object with domain and optional firstName/lastName. Returned candidates include confidence and the deliverability result when available. A search with a name costs five credits; domain-only searches cost ten.
- `upload_bulk_file`: POST `/verifyApiFile` uploads a file under the multipart field `file_contents`. Existing text/CSV inputs remain supported. Optional standard/high quality and Deep Scan settings are passed as form fields.
- `check_bulk_status`: GET `/getApiFileInfo` is retained as a documented compatibility endpoint because it exposes the existing line-count output fields. It handles waiting/errored states and both documented pipe-delimited forms. Finished jobs offer all results and the deliverable subset as CSV downloads.
- `get_credits`: GET `/credits` returns on-demand balance and nullable subscription balance/expiration without consuming credits.
- `check_disposable`: POST `/checkDisposable` accepts domain as a query parameter and returns disposability and mail-server diagnostics.
- `download_bulk_results`: GET `/maillists/{id}/progress` confirms completion, then provides a CSV/XLSX download from GET `/maillists/{id}`. Optional status filters select a subset of the results.

## Results and processing

Deliverability results include ok, email_disabled, dead_server, invalid_mx, disposable, spamtrap, ok_for_all, smtp_protocol, antispam_system, unknown, and invalid_syntax. Candidates with uncertain confidence or verification results should be assessed before use.

Standard verification costs one credit per unique email; high quality costs two. Automatic Deep Scan costs three credits per unresolved email re-verified. The provider accepts bulk files up to 100 MB and 1,000,000 rows. The text input tool supports CSV and TXT contents, with one email per row.

The existing optional timeout fields are retained for compatibility. The current API specification does not document them, so no timeout effect or default is guaranteed.

The API has no profile/self endpoint suitable for an identity tool. Credit balance provides a useful credential and account-capacity check.

## Sources

- [Official API documentation](https://api.emaillistverify.com/api-doc)
- [Official OpenAPI JSON](https://api.emaillistverify.com/api-doc-json)

Current contracts were audited on 2026-10-13. No live provider verification was performed for this refresh.
