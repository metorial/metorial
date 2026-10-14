# eSputnik API capabilities

Authentication uses Basic HTTP authentication with any username and an API key as the password. The integration uses the documented base URL `https://esputnik.com/api`. API keys can restrict permitted resources; account profile lookup uses `/v1/account/info`.

| Workflow | Tools | API |
| --- | --- | --- |
| Contact lifecycle | `upsert_contact`, `search_contacts`, `get_contact`, `delete_contact` | `/v1/contact`, `/v1/contacts`, `/v1/contact/{id}` |
| Bulk imports | `bulk_upsert_contacts`, `get_contact_import_status` | `/v1/contacts`, `/v1/importstatus/{sessionId}` |
| Custom field discovery | `get_additional_fields` | `/v1/additionalfields` |
| Segment discovery and membership | `list_segments`, `get_segment_contacts`, `update_segment_membership` | `/v1/groups`, `/v1/group/{id}/contacts`, `/attach`, `/detach` |
| Email suppression | `manage_unsubscribes` | `/v1/emails/unsubscribed/add`, `/v1/emails/unsubscribed/delete` |
| One-off messages | `send_email`, `send_sms` | `/v1/message/email`, `/v1/message/sms` |
| Prepared messages and delivery | `send_prepared_message`, `get_message_status` | `/v1/message/{id}/smartsend`, `/v1/message/status` |
| Workflow events | `generate_event` | `/v3/event` |
| Order lifecycle | `add_orders`, `delete_orders` | `/v1/orders` |
| Account identity and balance | `get_account_info` | `/v1/account/info`, `/v1/balance` |

Contact groups are sent as objects containing `name`, and returned group objects are exposed as names. Bulk imports accept up to 3,000 contacts. `contactFields` selects ordinary fields to update; omitting it can clear unspecified fields. `customFieldsIDs` selects custom fields to update, and selected fields missing from a contact are cleared. Mobile push updates can include device metadata, including `os`.

Segment reads return pages of at most 500 records and provide `nextStartIndex` when a page is full. Static membership changes accept internal or external contact IDs. Mixed identifiers are partitioned into separate requests; entries without an identifier are rejected before any request, avoiding the provider's detach-all behavior.

Email sends translate the single `to` address to the provider's `emails` array. Plain-text-only content is escaped into an HTML alternative. The existing `replyTo` field is forwarded for compatibility, although it is absent from the current outgoing-email reference and its effect is unverified. Direct SMS sends translate `phoneNumber` to `phoneNumbers`; a `templateId` invokes the prepared-message endpoint. Providing contact identifiers for direct SMS first upserts the SMS channel on that contact.

Prepared sends retain each recipient's channel and sender options by grouping matching options into requests with top-level `email` and `fromName`. Results expose queue outcomes and request IDs; delivery must be checked separately. Order submission exposes provider validation failures even on HTTP 200. Order deletion uses one query request per external order ID and runs asynchronously. Events accept nested JSON, have a default 20 KB limit, and repeated requests are processed separately.

Existing tool keys and field types are retained. Balance amounts and message delivery flags stay strings in existing public outputs. No file-output tools or triggers are registered.

See the [official API reference](https://docs.esputnik.com/reference) and [contact API guide](https://docs.esputnik.com/docs/api-methods-for-add-contacts).
