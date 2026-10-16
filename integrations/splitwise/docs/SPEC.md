# Splitwise integration specification

Splitwise API v3.0 provides users, shared expense records, groups, friends, comments, account activity, currencies, and categories. Official reference: https://dev.splitwise.com/ and the provider-maintained OpenAPI source at https://github.com/splitwise/api-docs.

## Authentication and configuration

OAuth 2.0 authorization-code connections use `/oauth/authorize` and `/oauth/token`. Personal API keys are bearer tokens generated on the application's details page. Both existing auth method keys and the saved `token` field are retained. The current official OAuth specification declares no scopes, refresh-token flow, or token expiry; this integration does not invent refresh or expiry state. Configuration is empty. No workspace or account identifier is required during connection setup.

## Capabilities

- Users: current-user identity, user lookup, and profile updates.
- Groups: list, get, create, delete, restore, add members, and remove members. Existing group-type choices remain supported, including legacy `apartment` and `house` values. Splitwise recommends `home` for new groups.
- Expenses: list with documented group/friend/date/update filters and limit/offset pagination, get, create equal or custom splits, update including recurrence, delete, and restore. Amounts and shares remain decimal strings; no floating-point conversion is performed. Group ID `0` is preserved where Splitwise uses it for expenses outside a group. Updating shares replaces the full set of shares.
- Friends: list, get details, add one friend, add multiple friends, and delete a friendship. Bulk creation uses the documented flattened `users__{index}__{property}` fields. Actual returned friend records determine the added-user output.
- Comments: list, create, and delete. Deletion is confirmed using the returned comment's ID and deletion timestamp rather than an absent success field.
- Account activity: `list_notifications` returns original notification objects, including nullable sources, provider HTML content, and future notification-type values. The optional limit preserves `0` as the provider maximum.
- Reference data: supported currencies and hierarchical expense categories. Expense creation uses subcategory IDs.

## Errors and result handling

Shared HTTP helpers preserve provider HTTP status and error bodies in service errors. HTTP-200 failures with nonempty errors or `success: false` are rejected. Boolean acknowledgement endpoints require `success: true`; expense creation and updates require an empty provider errors collection and a returned expense. Missing resource/list envelopes fail rather than becoming invented empty results.

Existing tool keys, fields, scalar types, enum values, defaults, and requiredness remain unchanged. New capabilities are additive. Existing receipt URL output fields remain provider metadata; no file download or transfer is performed by the detail tool.

## Scope and verification

Splitwise is one product and does not need separate product categories. The current official reference documents no webhook subscriptions; activity is retrieved through the notifications endpoint. Verification for this refresh is offline only. No expense, payment, account, group, friend, or comment operation was performed against Splitwise. Live acceptance, OAuth callbacks, and deployed behavior remain unverified.
