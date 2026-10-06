# Paystack API coverage

Authentication uses a backend `sk_test_…` or `sk_live_…` secret key with `Authorization: Bearer …` on `https://api.paystack.co`. Public keys cannot authorize these tools. Test mode does not move real funds and does not process settlements. No OAuth scopes, current-user identity endpoint, automatic financial retries or legacy triggers are provided.

| Capability | Registered tools | API routes |
| --- | --- | --- |
| Transactions | initialize_transaction, verify_transaction, list_transactions, charge_authorization | /transaction/initialize, /transaction/verify/:reference, /transaction, /transaction/charge_authorization |
| Customers | create_customer, get_customer, update_customer, list_customers | /customer, /customer/:code, /customer/set_risk_action |
| Plans | create_plan, list_plans, update_plan | /plan, /plan/:id_or_code |
| Subscriptions | create_subscription, get_subscription, list_subscriptions, disable_subscription, enable_subscription | /subscription, /subscription/:id_or_code, /subscription/disable, /subscription/enable |
| Transfers and beneficiaries | initiate_transfer, create_transfer_recipient, list_transfers, verify_transfer, list_transfer_recipients, delete_transfer_recipient, get_balance | /transfer, /transfer/verify/:reference, /transferrecipient, /transferrecipient/:id_or_code, /balance |
| Refunds and settlements | create_refund, list_refunds, list_settlements | /refund, /settlement |
| Pages and requests | create_payment_page, list_payment_pages, update_payment_page, create_payment_request, list_payment_requests, archive_payment_request | /page, /page/:id_or_slug, /paymentrequest, /paymentrequest/archive/:code |
| Accounts | create_subaccount, list_subaccounts, create_dedicated_virtual_account, list_dedicated_virtual_accounts | /subaccount, /dedicated_account |
| Disputes | list_disputes, resolve_dispute | /dispute, /dispute/:id/resolve |
| Verification | verify_bank_account, list_banks, resolve_card_bin | /bank/resolve, /bank, /decision/bin/:six_digits |

All 36 existing tool keys and input field names/types are retained. New optional inputs expose cursor pagination on the documented resources, bank cursor continuation, explicit plan update effects, and authorization-recipient email/code. The old authorization recipient inputs `accountNumber`/`bankCode` become optional because this documented recipient type instead requires `authorizationCode` and its bound `email`; bank/mobile-money types still validate the original required values before dispatch.

Output compatibility has explicit exceptions: every numeric resource ID retains its numeric key/type but becomes optional outside the safe numeric range, with a corresponding required exact string (optional `exactBankId` when bank resolution omits that field). List `totalCount`, `currentPage` and `totalPages` are optional when absent from provider metadata. Transaction channel/gateway response, plan subscription count, unexpanded transfer recipient code, scalar refund transaction reference and authorization-recipient account number are optional when unobserved. Transaction rows are never dropped to preserve unsafe numeric IDs. Currency amounts, counts and nested option numbers are not coerced into strings. Downstream consumers must handle these omissions and use exact IDs. A runtime without `JSON.parse` reviver source support fails before sending a request.

Offset pagination and cursor pagination are distinct. `nextCursor`, `previousCursor` and `perPage` describe observed provider metadata. Refund reference filtering verifies the reference once, including numeric-looking references, checks the returned reference and sends its exact ID as the documented `transaction` filter. Payment-request customer codes resolve to exact customer IDs. The legacy DVA output `bankCode` continues to mean the provider bank slug; `bankSlug` states that meaning explicitly. Monetary outputs remain numbers and must be safely representable integers in currency subunits; invalid or rounded amounts fail with reconciliation guidance rather than reporting an approximate value.

Plan updates default to affecting existing subscriptions. An omitted subscription authorization selects the customer's most recent reusable authorization; creation/enablement can schedule debits and notifications. Payment-request `amount` remains a required legacy input but is sent only when line items and tax are absent. `draft=true` suppresses sending; otherwise Paystack defaults notification to true. Dispute resolution requires the documented refund amount and previously uploaded filename; this integration does not fabricate an evidence upload.

Recipient deactivation and payment-request archiving require matching-resource state readback. Any unconfirmed mutation must be reconciled before retrying. Customers, plans, subaccounts and financial history are retained. Payment pages and checkout links are provider payment destinations, not downloadable files. No file-export capability is registered.

Primary references: [API introduction](https://paystack.com/docs/api/), [authentication](https://paystack.com/docs/api/authentication/), [pagination](https://paystack.com/docs/api/pagination/), [transactions](https://paystack.com/docs/api/transaction/), [plans](https://paystack.com/docs/api/plan/), [payment requests](https://paystack.com/docs/api/payment-request/), [transfer recipients](https://paystack.com/docs/api/transfer-recipient/).
