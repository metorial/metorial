# Brex

Manage Brex users, cards, vendors, budgets and spend limits; read accounts, settled transactions, expenses and transfer status; download exact receipt files; and initiate explicitly requested outgoing vendor transfers. Eighteen public tools retain the fifteen original keys.

## Connection and identity

The production API is `https://api.brex.com`. Existing `oauth` and `api_token` connection keys are preserved. OAuth partner credentials use the production authorization-code flow; access-token refresh preserves or rotates the refresh token. `oauth_readonly` requests only the read scopes used by these tools. The existing OAuth method requests the corresponding write scopes plus necessary read access, without PAN, onboarding, statement or travel scopes. Both scopes and an appropriate account role/product entitlement are required. Reconnect an existing OAuth connection to consent to newly required card-account access.

Developer tokens require `users.readonly` or `users` for connection identity verification and the scopes required by each tool. Developer tokens expire after 90 days of inactivity and stop working when their associated user is not active. OAuth access tokens use the returned expiry, or the documented one-hour lifetime when the response omits it. `get_current_user` calls the actual current-user endpoint; it does not infer company identity from a list. Partner staging is not a customer sandbox and is not supported by this production-only connection.

## Discovery and financial effects

Use the corresponding list tools to discover IDs, then `get_resource` for exact user/card/vendor/transfer/budget/spend-limit/cash-account readback. Vendor detail returns payment instrument IDs without bank numbers. `list_accounts` preserves its existing banking-data fields, so use it only with appropriate authorization.

All paginated lists return the provider continuation. Most limits range from 1 to 1000; expenses allow at most 100. `list_departments_locations` in both mode returns independent department and location cursors; continue with `departmentCursor` and `locationCursor`. Select a single resource type to use the legacy `cursor`. Cash account discovery fails explicitly if the provider indicates incomplete results without a documented continuation request.

Amounts remain signed integer minor units. Returned fractions or amounts outside JavaScript's safe integer range fail explicitly instead of being rounded; omitted or null response currency remains null. When syncing transactions, overlap time windows by a few days and deduplicate by transaction ID to account for delayed posting.

`manage_user` retains invitation as its creation default. `createInactive` creates an inactive employee without sending an invitation, but account automation must be considered. Current status transitions are ACTIVE↔DISABLED, INACTIVE↔ARCHIVED, and INVITED/INACTIVE→DELETED. Deletion can retain audit history. The current update API supports manager, department, location and status assignments; retained firstName/lastName/email update inputs and monthlySpendLimit fail explicitly instead of being ignored or sent to undocumented routes.

`manage_card` requires a name, type and owner for creation. USER cards use the user limit and have no card controls. CARD vendor cards must be virtual with both spend limit and duration. Card update supports spend controls, not name/type/owner changes. Lock and terminate require a documented reason code and notify the owner. Termination is permanent. The legacy TRANSACTION duration remains in the schema and is rejected explicitly because the current API documents only MONTHLY, QUARTERLY, YEARLY and ONE_TIME.

`list_budgets` and `manage_budget` default to current Budgets, which track planned spend. Select `resourceType: spend_limit` for hard/soft authorization controls and member assignments. Budget creation requires name, description, parentBudgetId, periodType and limit. Spend-limit creation requires explicit policy, visibility, card-automation and authorization settings; no audience or policy defaults are invented. Archiving retains history and may disable child spend limits. A balance is returned only when the API supplies the documented value; spent amounts are not represented as remaining balances.

`manage_vendor` manages contact records and can delete a vendor. The retained paymentAccountId input is rejected: a single selector cannot replace the required full payment-account payload safely. Use exact vendor readback to discover payment instruments for transfers.

`create_transfer` supports VENDOR instruments, positive integer USD minor units, external memo and a stable idempotency key. Omitted originatingAccountId reads the actual primary cash account; omitted idempotencyKey generates one invocation key retained in receipt/error metadata. The legacy BREX_CASH counterparty enum remains accepted by the schema but is rejected before any request; BREX_CASH is an originating-account type. Transfer creation does not prove settlement. Do not retry an ambiguous payment with a new key. No payment reversal, deletion or cleanup is promised. Card/vendor creation and budget/spend-limit create/update also generate a key when omitted and retain the exact key in safe receipt/error metadata, without automatic retries. User create/update forwards a caller-supplied optional key.

## Expenses and receipt files

`list_expenses` uses the current consolidated expense endpoint with an explicit CARD filter and maps original and billing amounts separately. `update_expense` retains its read-only branch when no update is supplied; memo updates use the current documented card-expense PUT route. Set memo to null to clear it. The old category input remains but fails explicitly because current updates support memo only.

Request `expand: ["receipts"]` to obtain receipt IDs and known downloadable file counts. `download_expense_receipt` selects the exact expense/receipt/file index and returns a downloadable file. Signed provider S3 GET links expire after 15 minutes and are refreshed from the same identifiers; earlier signed expiry is respected. The API token is never sent to S3. Receipt uploads and purchase creation are outside this tool set.

## Verification limits

The private suite uses a dedicated synthetic account, independent identity/readback and preregistered cleanup. Synthetic user/vendor provisioning requires explicit effects and retained-history gates; existing synthetic memo changes restore exact original state. It never initiates real payments, provisions real cards, archives shared budgets, sends unsolicited invitations or makes purchases. Missing credentials are a setup limitation and do not disable the entire suite. Local schema/protocol checks do not establish provider acceptance, financial effects, deployed file delivery or cleanup against a real account.
