# Gist integration specification

The integration provides 32 tools for a single Gist customer messaging workspace.
It uses the [official REST reference](https://developers.getgist.com/api/),
[OAuth guide](https://developers.getgist.com/docs/working-with-oauth/), and
[scope list](https://developers.getgist.com/docs/oauth-scopes/).

## Authentication

API keys and OAuth access tokens are sent as Bearer credentials over HTTPS.
OAuth authorization uses `https://app.getgist.com/oauth/authorize`; the
code is exchanged as URL-encoded form data at `/oauth/token`. Tokens do not
expire until the app is uninstalled or deleted; no refresh grant is documented.
The token's workspace is discovered at `/token/info`, also exposed by
`get_workspace`. Configuration is empty; no workspace ID is entered at setup.

The declared OAuth scopes match Gist's documented list: `read_contact`,
`write_contact`, `read_bulk_contacts`, `write_bulk_contacts`,
`read_conversations`, `write_conversations`, `read_events`, `read_tags`,
`write_tags`, `read_teams`, and `read_teammates`. The provider does not publish
separate scopes for every other API area; permissions remain provider controlled.

## Tools and API behavior

- Contacts: `get_contact`, `list_contacts`, `create_or_update_contact`,
  `delete_contact`, `batch_import_contacts`, `get_batch_import_status`.
  Identity is a Gist contact ID, email, or external user ID as documented per
  operation. Batch status exposes actual completion counts and errors. Lists
  accept page/per-page, filters, and sort fields. `createdWithinDays` maps to
  the provider's day-count filter. The older `createdSince` UNIX timestamp is
  converted to whole days, rounded up to provider precision.
- Conversations: `get_conversation`, `create_conversation`,
  `reply_to_conversation`, `search_conversations`, `manage_conversation`,
  `get_conversation_counts`, `list_conversation_messages`. Creation sends a
  contact `from` object and a plain-text body. Replies/notes send `message_type`
  and an explicit teammate or bot author. Assignment uses PATCH `/assign` and
  requires the acting teammate. State transitions use PATCH on the conversation;
  priorities use PATCH `/priority`. Search sends `filter_query` criteria in a
  POST body. Count endpoints use singular `/conversations/count`. Untag uses a
  tag ID; a legacy tag name is resolved by bounded, paginated lookup.
- Tags and segmentation: `manage_tags`, `list_segments`, `track_event`,
  `list_events`. Event tracking sends `event_name`; lists expose pagination.
  Tag contact lists use the documented `{ id, untag }` objects.
- Marketing: `list_campaigns`, `manage_campaign`, `manage_form`,
  `manage_subscription_type`. Campaign subscription changes POST `/campaigns`
  with the campaign ID and `unsubscribed`; a Gist contact ID is resolved to its
  actual email or external user ID first. Form retrieval sends GET `/forms` with the `form_id` query parameter.
  Form lists and submissions forward page/per-page and expose provider pagination.
  Form subscriptions send `fields` and
  the caller's optional consent choice. Submission rows retain original values.
  Subscription types POST to the type resource with `subscribed_status`.
- Knowledge base: `manage_article`, `get_article`, `list_articles`,
  `manage_collection`. Translation input arrays become locale-keyed objects.
  Article creation requires each translation's author, title, HTML, and status.
  Summaries expose translation arrays while original locale maps remain in raw
  responses. Search uses PATCH `/articles/search` with `search_text`; pagination
  accepts either documented `pages` or example `page` envelopes. Article search and
  collection lists forward page/per-page and expose the actual pagination metadata.
- Workspace and teams: `get_workspace`, `list_teams`. Teams/teammates expose
  IDs needed for conversation routing and article authorship. Token metadata
  identifies the authorized workspace without inventing a workspace name.
- Commerce: `manage_store`, `manage_customer`, `manage_product`, `manage_cart`,
  `manage_order`. Store discovery uses `/ecommerce/stores`; all child operations
  are scoped to a selected store. Variants are nested under products; carts are
  identified by store and customer. External customer/product/variant/order IDs
  must come from the caller's commerce platform. Currency uses `currency_code`,
  titles use `title`, totals use `order_total`, and variant lines use
  `product_variant_id`. Product category writes send an ID array, while raw
  product responses retain the provider's category objects. The legacy store interval remains minutes at the tool
  boundary and is converted to provider hours. Store tags use `contactTags`.

## Compatibility and failure behavior

All 28 original tool keys, input/output fields, types, requiredness, and enum
values remain. Additions are optional on original tools. Every original tool
can return `rawResponse`, an ordered array of untouched provider response bodies
for its requests, retaining actual nulls, objects, and partial-import errors.
Required malformed IDs/list entries fail explicitly. Optional summary fields
omit provider nulls; there are no fabricated IDs, zero counts, states, or dates.

Existing four-level priorities and `autoTagging` are retained in schemas but
rejected with instructions to use Gist's documented values. The legacy product
`category` name alone lacks the category ID needed by the documented API; use
`categories` with IDs and names. Schema checks do not prove provider execution.

No file download/export endpoints are wrapped, and no triggers are registered.
Provider webhooks are configured in Gist's dashboard; this integration does not
claim webhook registration or delivery verification.
