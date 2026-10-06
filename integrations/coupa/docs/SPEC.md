# Coupa integration

## Connection

OAuth Client Credentials uses form-encoded `POST /oauth2/token`, then a Bearer token for JSON Core API requests. The instance URL belongs to the connection; validated stored configuration remains a fallback for older connections. Token lifetime comes from native `expires_in`. Renewal repeats the client-credentials grant with the original instance, client credentials and configured scopes; it does not use a refresh-token grant or assume a 24-hour lifetime.

The existing deprecated API Key method sends only `X-COUPA-API-KEY`, never a simultaneous Bearer header. Availability depends on the deployment. Connections whose saved output cannot identify the authentication mode must reconnect. Both methods require a credential-free HTTPS root URL and refuse redirects. IP allowlists, scopes, role permissions and tenant settings still apply. The bounded API exposes no verified current-person identity tool.

## Supported tools

| Resource | Tools |
| --- | --- |
| Purchase orders | Search, exact get, create external order header, update supported fields |
| Invoices | Search, exact get, create draft or credit note |
| Suppliers | Search, exact get through `get_resource`, create, update |
| Requisitions | Search, exact get through `get_resource`, create |
| Expense reports | Search, exact get through `get_resource`, create draft |
| Contracts | Search, exact get through `get_resource`, create |
| Approvals | Search, exact get through `get_resource`, approve or reject a pending approval |
| Users | Search, exact get through `get_resource`, create, update |
| Accounts | Search, exact get through `get_resource`, create |
| Receipts | Search, exact get through `get_resource`, create receiving transaction |

There are 26 public tools: 25 retained keys and the consolidated `get_resource` discriminator for eight documented resource types. This integration does not provide payments, budgets, sourcing, risk, event subscriptions, file exports or document deletion. Native file links may remain in ordinary metadata; no download or expiry guarantee is implied.

## Native contracts and compatibility

Requests use JSON with explicit Accept headers. IDs must be positive safe integers. Searches accept limits of 1–50 and nonnegative offsets. A count is the returned page length. Full pages expose the next offset as possible continuation; short pages do not invent a native total or independent absence proof. Filters must use documented resource fields and cannot replace paging or authentication parameters.

Legacy numeric amounts remain accepted where representable. Additive decimal-string fields preserve native precision without conversion through floating point; conflicting aliases, exponent notation and out-of-range values are rejected before dispatch. Native output amounts remain strings or other actual native types. Custom fields preserve the historical global namespace by default; `customFieldsGlobalNamespace: false` selects the documented `custom-fields` namespace. Global custom fields cannot replace native attributes.

- External purchase-order creation requires the native supplier and ship-to-user prerequisites and the instance feature. It is not a generic order-submission workflow.
- Invoice credit notes use `is-credit-note`; line prices retain native decimal precision. Historical `tax` objects are retained in the input schema but refused with guidance to documented tax-line or tax-code fields.
- Expense drafts use writable `expensed-by` and line-level currency/category fields. Historical submitted-by and department inputs are retained but refused when they cannot be mapped to documented writable fields.
- Contracts use native number, supplier, explicit status, contract-type label and minimum/maximum-value fields.
- Account codes are calculated from explicit segments within an existing account type. Historical code input is checked against those segments, not posted as a writable code. UI-only name filters are refused.
- Receipt creation uses `receiving_transactions`, `InventoryReceipt`, an order-line reference and transaction-date. Historical received-by input cannot override native creator identity.
- Active-user queries use the documented active status. The legacy false filter is refused rather than claiming a complete inactive-user inventory.

Native noncredential metadata is preserved. Returned nonempty `cxml-secret`, `cxml-invoice-secret` and `coupa-connect-secret` values are omitted, including nested supplier records. Null and empty values remain native. Reflections of those values or connection credentials elsewhere are refused; generic tools do not manage passwords or credentials.

## Receipts and retained effects

Created or updated native IDs and requested writable identity/state fields are checked without claiming full-document equality. Approval actions return the approvable document, so the integration separately reads the exact approval and confirms its parent and status. If post-dispatch receipt validation or approval verification fails, the result states that the operation may have taken effect and requires native reconciliation before retrying. No automatic retry, atomicity, concurrency protection, rollback or financial undo is promised.

## Official references

- [Core API OAuth](https://docs.coupa.com/en/developer-documentation/the-coupa-core-api/oauth-2.0-and-oidc)
- [Querying options](https://docs.coupa.com/en/developer-documentation/the-coupa-core-api/get-started-with-the-api/querying-options)
- [JSON return formats](https://docs.coupa.com/en/developer-documentation/the-coupa-core-api/get-started-with-the-api/api-return-formats)
- [Custom-field namespace](https://docs.coupa.com/en/developer-documentation/the-coupa-core-api/get-started-with-the-api/custom-field-namespace)
- [Supplier fields](https://docs.coupa.com/en/developer-documentation/the-coupa-core-api/resources/reference-data-resources/suppliers-api-suppliers)
- [Receiving transactions](https://docs.coupa.com/en/developer-documentation/the-coupa-core-api/resources/transactional-resources/receipts-api/receiving-transactions-api-receiving_transactions)


### Receipt confirmation and local bounds

Native requested fields, nested references and requested line/role values must be confirmed by the returned document. Decimal formatting such as `2` and `2.000000` is equivalent without numeric rounding. A partial, ignored, mismatched or unsafe receipt returns an unconfirmed outcome with only validated requested/returned integer IDs; it does not authorize a retry or imply an undo. Approval actions first require an exact native approvable ID/type, and their returned document ID is identified separately from the approval ID.

Explicit empty supplier and user text changes are preserved for Coupa validation. Known native fields cannot be routed through legacy global custom fields; unrelated established custom names remain supported, and modern fields may use the explicit custom-fields namespace. Tokens have an explicit local 1 MiB safety bound (not a claimed native JWT limit). Pagination refuses an unsafe continuation offset instead of returning a rounded cursor.
