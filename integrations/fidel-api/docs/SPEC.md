# Fidel API integration reference

This integration manages Select Transactions API resources and card-linked offers through `https://api.fidel.uk/v1`. The current [Fidel overview](https://docs.fidelapi.com/docs/) describes Select Transactions API and Offers as a Service. Transaction Stream, direct reimbursement, and Marketplace offer adoption are outside this integration's tool surface.

## Authentication and environment

Configure a secret API key in `token`. Requests send it in `Fidel-Key`. For `enroll_card`, also configure an SDK/public key in the optional `sdkKey` credential. Fidel's [Create Card reference](https://reference.fidel.uk/reference/create-card) requires a public key; direct live card enrollment requires PCI compliance and explicit cardholder consent (`termsOfUse: true`). API keys and SDK keys must target the same test/live environment. Existing connections can continue using their stored secret key for management tools.

Keys select test or live data; the `environment` configuration is only a label and does not switch credentials. See [Fidel's getting-started guide](https://docs.fidelapi.com/docs/select/getting-started).

## Supported operations

Call `list_programs` to discover program IDs before using program-scoped tools. List/read results include provider IDs for subsequent operations.

| Resource | Tools |
| --- | --- |
| Programs | `create_program`, `get_program`, `list_programs`, `update_program` |
| Brands | `create_brand`, `get_brand`, `list_brands`, `update_brand`, `delete_brand` |
| Locations | `create_location`, `get_location`, `list_locations`, `update_location`, `delete_location` |
| Cards | `enroll_card`, `get_card`, `list_cards`, `list_cards_by_metadata`, `update_card_metadata`, `delete_card` |
| Transactions | `get_transaction`, `list_transactions`, `create_test_transaction` |
| Offers | `create_offer`, `get_offer`, `list_offers`, `update_offer`, `delete_offer` |
| Offer relationships | `manage_offer_locations`, `link_all_offer_locations`, `list_offer_locations`, `manage_offer_card`, `list_offer_cards`, `check_offer_card` |
| Webhooks | `create_webhook`, `get_webhook`, `list_webhooks`, `update_webhook`, `delete_webhook` |
| Missing transactions | `create_missing_transaction_request`, `get_missing_transaction_request`, `list_missing_transaction_requests` |

## Pagination and responses

The original numeric `start` fields remain offsets. The client follows Fidel's continuation keys to reach the offset. For continued pages, prefer the optional `cursor` field: pass `JSON.stringify(last)` from a previous response, without URL encoding. Do not combine a positive offset with a cursor. The HTTP client encodes query values.

Program webhook listing documents a limit and event filter instead of a cursor, so its legacy offset is applied locally to the fetched results. Missing transaction request listing accepts the provider's string start token directly in `cursor`; its reference does not document the continuation response shape.

`count` is returned only when Fidel supplies it; it is not an invented account-wide total. Optional normalized fields are omitted when unavailable. The additive `raw` fields retain provider objects, including null values, nested card/brand/location details, network onboarding state, and properties outside the normalized subset. No financial amount, count, or identifier is defaulted to zero or an empty string.

## Offers and webhooks

Creating an offer requires `startDate`. Link the offer's locations separately using `manage_offer_locations` or `link_all_offer_locations`. Maximum reward maps to `type.maxRewardAmount`. Offer deletion supports self-sourced publisher offers; Marketplace and content-provider offers are not deletable. Bulk location linking is asynchronous: an accepted request is not proof that all locations are linked. Verify with `list_offer_locations`.

Webhook destinations must use HTTPS. Brand consent and offer-location events are account-scoped; program events use the supplied program. Individual webhook read/update/delete operations use `/hooks/{hookId}`. A partial webhook update first reads the current event or URL because Fidel's update endpoint requires both fields. These tools manage external subscriptions; they do not expose inbound event triggers.

## Compatibility notes

Some original fields remain for compatibility even where the current official request schema omits them. `update_brand.name` and `create_location.geolocation` are retained as legacy inputs and forwarded, with no claim that the current API supports them. Original program inputs on account-level resource operations remain required context; the documented route uses the resource ID. Test transaction currency is derived from the location, and its legacy currency/program fields are not sent as unsupported request fields.

For endpoint schemas and network restrictions, use the [official API reference](https://reference.fidel.uk/llms.txt), [cards guide](https://docs.fidelapi.com/docs/select/cards), [offers guide](https://docs.fidelapi.com/docs/select/offers), and [webhook guide](https://docs.fidelapi.com/docs/select/webhooks).
