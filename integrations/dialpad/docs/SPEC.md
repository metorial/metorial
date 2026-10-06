# Dialpad API contract

Seventeen tools: fifteen retained keys plus exact native `get_resource` and `list_resources` (call-center operators only). All inputs use object schemas. Numeric IDs are validated as exact positive integers within the supported numeric range; contact IDs and cursors remain native strings. Pagination preserves native empty arrays and cursor values.

API hosts: `https://dialpad.com/api/v2` and `https://sandbox.dialpad.com/api/v2`. OAuth hosts are separate origins without the API prefix. Authorization uses Bearer headers, bounded requests and responses, disabled redirects and no automatic mutation retries. New OAuth authorization uses S256 PKCE persisted verification state, with documented legacy compatibility for unmarked callbacks.

Native routes: users `/users`, contacts `/contacts` (PUT for UID upsert), completed calls `/call`, call-center creation `/callcenters`, office discovery `/offices`, operators `/callcenters/{id}/operators` (DELETE body `user_id`), numbers `/numbers/{number}/assign` and DELETE `/numbers/{number}?release=false`, API-managed blocks `/blockednumbers/add` and `/blockednumbers/remove`. Do Not Disturb uses `/users/{id}/togglednd`; hangup uses PUT `/call/{id}/actions/hangup`; transfers send one nested `to` destination.

SMS exposes native acceptance/status and message ID. Device initiation has no call-ID receipt. Empty hangup acknowledgments do not establish completion. Unsupported legacy timezone, warm/cold transfer and call-ID recording fields are preserved in schemas with explicit actionable refusals instead of guessed API behavior.

Official sources:

- https://developers.dialpad.com/docs/oauth
- https://developers.dialpad.com/reference/oauth2tokenpost
- https://developers.dialpad.com/reference/calltransfer_call
- https://developers.dialpad.com/reference/userget
- https://developers.dialpad.com/reference/usersget
- https://developers.dialpad.com/reference/contactsget
- https://developers.dialpad.com/reference/smssend
- https://developers.dialpad.com/reference/calllist

The current versioned public OpenAPI document embedded in the call-transfer reference is the exact route/schema authority; its captured source metadata is retained in implementation evidence. No unsupported catalog capability, recording download, event delivery or trigger is claimed.
