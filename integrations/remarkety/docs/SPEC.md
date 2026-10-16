# Remarkety API specification

## Authentication and configuration

Connect with the API key/token and Store ID shown in Remarkety **Settings > API Keys**. Both values are stored with the connection. The optional store domain and platform settings apply to event requests only; they do not duplicate authentication inputs.

The retained event tools send JSON to `https://webhooks.remarkety.com/webhooks/?storeId=<STORE_ID>` with `x-api-key` and `x-event-type` headers, plus optional `x-domain` and `x-platform` headers. Their existing event names, payload mapping, and create/update selection remain available.

Batch uploads use `POST https://app.remarkety.com/api/v2/stores/<STORE_ID>/contacts/batch` with `X-Token`. The API requires a user API token. Direct contact unsubscription uses `POST https://app.remarkety.com/api/v1/stores/<STORE_ID>/contacts/unsubscribe` with `x-api-key`.

## Tools

| Tool | Behavior |
| --- | --- |
| `upsert_customer` | Sends `customers/create` when `updatedAt` is absent, or `customers/update` when supplied. Retains customer ID, marketing preferences, tags, groups, address, and reward-point mappings. |
| `upsert_order` | Sends the selected `orders/create` or `orders/update` event with order and line-item information. |
| `manage_product` | Sends product create, update, or delete events. Product ID is required; existing optional fields remain available. |
| `upsert_cart` | Sends cart create/update events. Anonymous carts may omit customer information and use a null email. |
| `manage_newsletter` | Retains newsletter subscribe/unsubscribe event behavior, including existing optional inputs. |
| `send_custom_event` | Sends the supplied event name and arbitrary properties, with an optional contact email. Match the event name to the configured automation. |
| `batch_upload_contacts` | Submits 1–100 contacts with the existing update/tag options. Returns the submitted contact count, provider counts when present, and the complete provider result including individual failure reasons. `success` is true only when the provider returns a successful-contact count and reports zero failures. |
| `unsubscribe_contact` | Uses the documented contact endpoint to unsubscribe email, SMS, or both. Requires at least one identifier; SMS numbers use E.164 format. Supports an optional reason and returns the provider response. |

The batch `updateExisting` and `appendTags` options retain their existing default behavior of true when omitted. A batch may partially succeed; inspect `failedCount` and `result.failedReason` before retrying failed contacts. Missing counts are not replaced with zero.

## Error and response behavior

HTTP and network failures are converted to user-facing service errors, retaining available upstream status and provider body details. Explicit boolean `success: false` responses are also treated as failures; numeric batch success counts remain data. Write responses confirm request processing, not campaign delivery or eventual automation execution.

No file download/export tools or outgoing-webhook triggers are registered. Personalized coupons require a discount endpoint implemented by the merchant for Remarkety to call; this integration does not create that endpoint.

## Official documentation and verification limits

Reviewed on 2026-10-15:

- [Uploading contacts in batch via API](https://support.remarkety.com/hc/en-us/articles/360000694746-Uploading-contacts-in-batch-via-API): endpoint, `X-Token`, 100-contact maximum, option semantics, and success/failure response example.
- [Unsubscribing a contact using API](https://support.remarkety.com/hc/en-us/articles/360044121611-Unsubscribing-a-contact-using-API): endpoint, `x-api-key`, email/SMS identifiers, and reason.
- [Integrating custom platforms with Remarkety](https://support.remarkety.com/hc/en-us/articles/212975683-Integrating-custom-platforms-with-Remarkety): customer/order event guidance, ID consistency, and merchant-hosted coupon behavior.
- [Setup client-side tracking using Google Tag Manager](https://support.remarkety.com/hc/en-us/articles/360021988732-Setup-client-side-tracking-using-Google-Tag-Manager): custom event names and configured tracking workflows.
- [Sending contact information via API](https://support.remarkety.com/hc/en-us/articles/115000520263-Sending-contact-information-via-API): a separate direct contact endpoint. It is not substituted for the existing customer event route.
- [Remarkety Custom API V2](https://support.remarkety.com/hc/en-us/articles/115005328223-Remarkety-Custom-API-V2): describes a polling API to be implemented on the merchant's own server, not customer/product read endpoints hosted by Remarkety.

The linked `docs-api-v1.remarkety.com` reference and static REST documentation could not be reached during this refresh. Detailed legacy event schemas and their current runtime acceptance could not be independently verified; the existing contracts were preserved. The accessible official documentation exposes no suitable current-account/profile endpoint, so no identity tool is invented.

No authenticated provider calls or live E2E were performed. Build and schema checks do not establish provider runtime behavior.
