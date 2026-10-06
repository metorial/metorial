# Aircall

Manage calls, shared contacts, users, teams, number discovery and text messaging through Aircall's Public API. Seventeen tools retain all fourteen existing action keys and add company summary, exact contact detail and existing call-audio download. No event subscriptions are registered.

Use Basic authentication for one company's API-key settings or OAuth for an authorized company integration. OAuth access tokens do not expire according to the current API reference. Basic company summary does not expose a company ID or identify a person; OAuth integration details provide a native company ID. Reconnect if authorization is revoked.

Call IDs are native Int64 values. Use `callIdExact` from list/get tools. The legacy numeric `callId` remains available only when safely representable. Page size is at most fifty; calls and contacts expose at most 10,000 results per query, and calls have a six-month history window. Follow native continuation metadata and narrow time ranges rather than assuming an exhaustive collection. The retained `contactId` call-search field has no documented native filter; select a phone number with `get_contact` instead. Tag filters use decimal ID strings.

Call creation and many call controls return empty native acknowledgements. Acceptance does not prove completion or provide a new call ID. Comments cannot be removed. Archive changes a legacy flag, without closing the Workspace conversation or erasing history. Recording deletion is delayed and also removes AI artifacts; voicemail deletion is delayed. User creation sends an invitation and queued deletion can destroy associated data. The documented V1 user routes have announced deprecation and remain supported here while available.

Shared-contact updates use native contact/detail routes. Names are optional at creation; at least one phone value is required. Phone values may be normalized. Contact deletion is independently checked for exact absence, without an erasure claim for call history. Team deletion affects routing and retains users/calls.

`send_message` retains its existing key and text fields. It sends text through the native number route in the retained inbox-skipping mode. A pending message ID is acceptance, not delivery; there is no documented history endpoint for reconciliation, so wait for the provider callback and avoid automatic resends. Media uploads are not exposed by this tool.

`download_call_media` prepares an existing recording or voicemail MP3 from the documented signed storage location. Direct URLs expire after one hour and access remains subject to retention, privacy and permissions. Renewal rereads the same call and binds authorization, SID, start time, number, media kind and storage resource. Other storage locations require the native call view. No API credentials are sent to signed storage.

The private suite remains active. Authorized fixture reads and audio verification are available; mutative scenarios stop before effects where complete isolation, association history or reversal cannot be independently proven. Offline checks do not establish live API acceptance, deployed URL renewal or provider retention outcomes.

Sources: [API reference](https://developers.aircall.io/api-references), [authentication](https://developer.aircall.io/docs/authentication), [call data](https://developer.aircall.io/docs/work-with-call-data).
