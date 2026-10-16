# Piggy API coverage

Piggy is now known as Leat. The current [official API reference](https://docs.leat.com/llms.txt) uses `https://api.leat.com/api/v3/oauth/clients`. This integration retains the documented `https://api.piggy.eu` host used by existing connections and the official PHP SDK; requests use the `/api/v3/oauth/clients` route prefix.

## Authentication

[Personal Access Tokens](https://docs.leat.com/v3/authentication.md) from a Private App are the recommended credential. Tokens use `Authorization: Bearer <token>` and may have a user-selected expiration date. Renew an expired token in the provider dashboard and reconnect.

The existing `oauth_client_credentials` method remains available. It exchanges the saved client ID and secret at `/oauth/token` using `grant_type=client_credentials`, retains the returned token expiration, and acquires a fresh token using those credentials when renewal is needed. No authorization-code grant or refresh-token grant is substituted for that flow.

The optional `shopUuid` setting supplies a default shop for transaction tools. Call `list_shops` to discover available shops and override the default in individual tool inputs.

## Available operations

| Area | Tools |
| --- | --- |
| Contacts | `list_contacts`, `get_contact`, `create_contact`, `update_contact`, `delete_contact` |
| Attribute discovery | `list_contact_attributes` |
| Contact identifiers | `manage_contact_identifiers`: find, create, link, unlink, list |
| Credits | `award_credits`, `calculate_credits`, `list_loyalty_transactions` |
| Rewards | `list_rewards`, `claim_reward`: claim or reverse |
| Vouchers | `manage_vouchers`: list, find, create, update, redeem |
| Gift cards | `manage_giftcards`: list, get, findByHash, create, transact; `list_giftcard_transactions` |
| Prepaid | `manage_prepaid`: balance, list, transact |
| Reversals | `reverse_transaction`: credit, prepaid, giftcard |
| Program discovery | `list_shops`, `list_promotions`, `get_loyalty_program` |
| Automations | `trigger_automation`: list or trigger |

## Provider constraints

Credit awards require either `credits` or `unitValue`. Credit calculation is a preview: time-based loyalty rules can change the eventual award. Use reversal for refunds so the original transaction values are compensated accurately. The provider recommends Orders, Visits, or Bookings for new purchase workflows; the existing credit-reception interface remains available.

Money amounts are whole numbers in cents. A positive gift card or prepaid amount adds funds and a negative amount deducts funds. Gift card transactions are subject to the provider's program and increment restrictions. Only the most recent gift card transaction can be reversed.

Voucher updates require `status` to be `ACTIVE` or `DEACTIVATED`; the other existing status values apply to listing. Redemption requires a contact UUID when the voucher has no assigned contact. Promotion expiration durations are seconds. Contact deletion is scheduled asynchronously and is irreversible.

Only automations with event `contact_updated` can be triggered through the automation-run endpoint. The list response may omit automation UUIDs, so obtain the UUID from the provider dashboard when absent.

Outputs preserve provider resource data in their existing passthrough fields or an additive `raw` object. Typed aliases omit unavailable/null values rather than inventing balances or statuses. Gift card transaction responses identify the card but may omit its post-transaction balance; use the get action to retrieve the current balance separately.
