# Dialpad

Read company and current-user identity, discover users, contacts, offices, completed calls, call centers and number assignments, and read exact resources and native operator collections. The integration retains the fifteen original tool keys and adds `get_resource` and `list_resources`.

Production and sandbox API keys and OAuth connections are supported. New OAuth requests use PKCE and only the documented `calls:list` and `offline_access` scopes needed here. Existing unmarked authorization callbacks remain compatible with the provider's optional PKCE flow; tokens cannot be moved between environments. Company administration and license prerequisites still apply to administrative actions.

User, contact and call-center changes return native receipts with exact readback. Contact upsert can modify an existing shared contact. User email updates replace the email list; timezone is readable but cannot be set through this API. Update Do Not Disturb separately from other fields. Provisioning and operator membership can affect licenses and billing.

Call initiation returns the selected device acknowledgment without inventing a call ID or claiming connection. SMS preserves pending, failed and success states; acceptance does not establish delivery. Hangup returns request acceptance, and transfers preserve the requested and returned call IDs separately. The legacy warm/cold transfer selector has no current native equivalent and must be omitted. The legacy recording action is refused because the current user-active-call endpoint cannot bind the supplied call ID.

Number unassignment returns the exact number to the company pool without releasing it. Optional assignment preconditions are checked before the request, but concurrent changes are not atomically protected. List target filters apply to the current native page only; follow the returned cursor even when the filtered page is empty. API-managed block IDs are exact E.164 phone numbers; blocks created outside the API are excluded.

No recording-file delivery is offered: the documented recording-share pages do not establish an authenticated native file-download contract. No triggers are registered. Calls, messages, licenses and deleted resources may retain historical effects that require manual reconciliation.
