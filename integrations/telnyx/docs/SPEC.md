# Telnyx v2 contract

The current official OpenAPI is the native contract for the 18 public tools. API base: `https://api.telnyx.com/v2`; v2 API-key Bearer authentication. No documented current-user identity endpoint is invented. Connection IDs and other numeric-looking identifiers remain strings.

| Capability | Public keys and native routes |
| --- | --- |
| Messages | `send_message`: POST `/messages`; `get_message`: GET `/messages/{id}` |
| Numbers | `search_phone_numbers`: GET `/available_phone_numbers`; `list_phone_numbers`: GET `/phone_numbers`; `manage_phone_number`: GET/PATCH/DELETE `/phone_numbers/{id}`; `order_phone_numbers`: POST `/number_orders` or GET `/number_orders/{id}` |
| Verification | `send_verification`: POST `/verifications/{channel}` or GET `/verifications/{id}`; `verify_code`: POST `/verifications/by_phone_number/{phone}/actions/verify`; `manage_verify_profile`: `/verify_profiles` and `/verify_profiles/{id}` |
| Profiles | `manage_messaging_profile`: `/messaging_profiles`, exact profile CRUD and native phone-number/short-code association reads |
| Voice | `dial_call`: POST `/calls`; `call_action`: GET `/calls/{call_control_id}` or POST `/calls/{call_control_id}/actions/{action}`; retained `play_audio` maps to `playback_start` |
| Fax | `send_fax`: POST `/faxes` (202 acceptance); `get_fax`: GET `/faxes/{id}`, optional completed inbound `/actions/refresh`, PDF delivery |
| SIM | `manage_sim_card`: `/sim_cards`, `/sim_cards/{id}`, documented 202 enable/disable/standby actions; exact status GET `/sim_card_actions/{id}` |
| Discovery and balance | `list_connections`: GET `/connections`; `number_lookup`: GET `/number_lookup/{phone}`; `get_balance`: GET `/balance` |

Paging is native one-based `page[number]`/`page[size]`, with provider metadata preserved when returned. No total/end marker is invented. Local list-response safety bound is 1,000 records; page sizes remain within the documented endpoint bounds. Available-number search uses `filter[locality]`, `filter[administrative_area]`, native feature arrays and `filter[limit]`; feature objects are mapped to their names.

Message received/sent/completed timestamps can be null. `receivedAt` is the native field; a legacy `createdAt` is only returned when that distinct native property exists. All recipient statuses are available. Native money strings and currency are preserved; default currency is not guessed.

Requests validate required action fields before effectful dispatch. Native receipts bind exact IDs and requested supported fields. A response failure after dispatch can leave an accepted write; there are no automatic retries or invented transaction guarantees. Profile PATCH preserves unspecified settings. Legacy aggregate Verify timeout is explicitly unsupported; per-channel native configuration is additive, with flashcall settings create-only under the current PATCH contract. Flash-call sends reject unsupported custom codes before dispatch.

SIM transition responses are action records, with a distinct action ID and native SIM ID. Action status is separate from SIM state. Data usage retains decimal amount/unit; the optional legacy byte property remains in the output schema but is omitted without an evidenced conversion.

Inbound fax media-URL refresh is only allowed for exact completed inbound fax identity. Temporary URL expiry is conservatively derived from native AWS signing metadata and the documented ten-minute fax link lifetime. Reserved renewal retains the exact fax/connection/direction/from/to reference. Outbound stored URLs have no documented renewal promise and use bounded PDF content. HTTPS AWS object URLs are the supported file-host contract; redirects, API bearer forwarding, oversized streams, byte-count mismatches and non-PDF bodies are refused.

Provider and transport errors use ServiceError and status-only static messages without retained raw transport parents. Native credential reflections in ordinary strings/keys are rejected with shared literal matching plus bounded encoded forms. Shared HTTP trace capture occurs before this adapter and retains its existing semantics; no universal trace/secret guarantee is claimed.

No legacy triggers or replacement triggers are present. No real provider operation was used for verification. Private coverage is active, controlled, static/live-unverified, with explicit prerequisites for paid deliveries and irreversible effects.

## Primary sources

- https://github.com/team-telnyx/openapi/blob/master/openapi/spec3.json
- https://developers.telnyx.com/api-reference/messages/send-a-message
- https://developers.telnyx.com/api-reference/call-commands/answer-call
- https://support.telnyx.com/en/articles/4305158-api-keys-and-how-to-use-them
- https://support.telnyx.com/en/articles/5812328-sim-card-actions
