# Memberstack integration

Manage members, free plan connections, token verification, and Data Tables using the Memberstack Admin REST API.

## Authentication

Use a secret API key from **Dev Tools → Keys & IDs** in the Memberstack dashboard. Sandbox keys start with `sk_sb_`; live keys start with `sk_`. Requests use `X-API-KEY` at `https://admin.memberstack.com`. Sandbox apps support up to 50 test members. The API rate limit is 25 requests per second.

The connection has no workspace or app ID configuration: the key identifies the app and environment. Authentication setup stores the supplied key without a remote probe. There is no documented Admin API current-account/profile endpoint. `verify_token` identifies the member associated with a supplied JWT.

## Members

| Tool | Behavior |
| --- | --- |
| `list_members` | One page of members; numeric cursor, ASC/DESC order, optional JSON inclusion. Supplied limits above 100 are forwarded and capped at 100 by Memberstack. Continue with `endCursor` while `hasMore` is true. |
| `get_member` | Retrieve by ID or email, optionally including team memberships. A missing member produces a not-found error. |
| `create_member` | Create using the existing required email and password inputs, optionally assigning free plans and member data. |
| `create_passwordless_member` | Create without a password when email/OTP authentication is enabled on the app. Does not send an OTP email. |
| `update_member` | Update email, verified status, profile image, custom fields, metadata, JSON, or login redirect. `customFields` and `metaData` shallow-merge; falsy metadata values remove keys. JSON is replaced entirely. The legacy password field is forwarded unchanged, but password-update semantics are not described in current Admin API docs and remain unverified. A successful member response does not confirm a password change. |
| `delete_member` | Permanently delete a member; optionally delete its Stripe customer and cancel subscriptions. Returns the provider-confirmed deleted member ID. |
| `manage_member_plan` | Add/remove a free plan. The provider acknowledges success without returning the member; the tool then retrieves the member separately. A failed follow-up read does not roll back the mutation. Check the member before repeating a change. |
| `verify_token` | Verify a member JWT and return the member ID and any available claims. |

Member outputs retain the existing typed fields and include complete provider data under `raw`. Optional summaries omit unavailable non-nullable values without inventing empty objects, timestamps, IDs, counts, or state. Plan connections returned as bare IDs by some provider versions remain in `raw`; the existing object-array summary is omitted in that case. Team membership data is opt-in through `get_member.includeTeams`.

Paid subscriptions require Memberstack's checkout flow or Stripe Customer Portal. Free plan IDs are available from the Memberstack dashboard; no public Admin plan-discovery endpoint is documented.

## Data Tables

Tables must first exist in the Memberstack dashboard. Call `list_data_tables` to discover table keys/IDs, then `get_data_table` to inspect field keys, required values, relationships, and access rules.

- `query_data_records` supports `many`, `unique`, and `count` modes. Unique queries use a record ID. Many/count queries accept filters, sorting and pagination. Use either `include` or `select`, and either `skip` or `after`. Cursor queries require `orderBy: { internalOrder: "asc" }` on every page. The complete result preserves selected fields, relationships, counts and pagination.
- `manage_data_record` creates, partially updates, or permanently deletes a record. Creation accepts an optional member owner. Updates require a non-empty data object. Record IDs can be discovered with `query_data_records`. The provider's actual created/updated/deleted record is returned, including DECIMAL values as strings; queries may return those values as numbers.

Data Table operations use `/v2/data-tables`. The Members and Data Tables tool categories can be selected independently.

## Scope and limitations

No downloadable files or trigger subscriptions are exposed. Memberstack supports dashboard-managed webhooks, but this integration does not register or receive them. The REST API has no webhook-signature verification endpoint.

Requests use a 30-second timeout. Upstream errors, including nested error bodies, become structured service errors. Local schema/build checks do not establish provider runtime behavior or account-specific permissions.

## Official references

- [REST quick start and error contracts](https://developers.memberstack.com/admin-rest-api/quick-start)
- [Member actions](https://developers.memberstack.com/admin-rest-api/member-actions)
- [Data Tables](https://developers.memberstack.com/admin-rest-api/data-tables)
- [Token verification](https://developers.memberstack.com/admin-rest-api/verification)
- [Official Admin SDK](https://github.com/Memberstack/memberstack-admin)
