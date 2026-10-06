# Telnyx

Use Telnyx v2 API keys to send SMS/MMS and faxes, initiate and control calls, search and manage phone numbers, manage messaging and Verify profiles, inspect verification and SIM action status, look up numbers, read balance, and discover connections. The 18 public tools retain the original 16 keys.

Calls, messages, number orders, fax processing and SIM transitions are asynchronous and may incur charges or external effects. Native acceptance receipts do not promise delivery, provisioning or transition completion. Read the exact returned IDs and status before retrying uncertain writes. Releasing a number or decommissioning a SIM is irreversible; deleting profiles does not erase provider audit or delivery history.

Connection discovery returns native connection IDs and application types. Balance access verifies the API key; it does not identify a person or key owner. Telnyx v1 API tokens are incompatible with these v2 Bearer requests.

Fax status can provide a downloadable PDF. Completed inbound faxes support the documented media-URL refresh. Outbound PDF retrieval requires `storeMedia` at send time; outgoing renewal is not promised. Current file delivery accepts documented HTTPS AWS storage URLs, caps content delivery at 16 MiB, and does not send the API key to storage hosts. Native signing timestamps determine expiry; unknown expiry uses bounded PDF content where available.

Verify timeouts are native per-channel settings. The retained `defaultTimeoutSecs` input is rejected with guidance rather than silently ignored. SIM usage returns its exact decimal amount and native unit; the retained optional byte field is omitted because the API does not establish the byte conversion. Decimal money values retain provider strings and currency. Nullable timestamps and optional native states remain explicit.

The active controlled private suite is live-unverified. No calls, messages, number purchases, fax downloads, SIM changes or account resource operations were performed during this refresh.

Official references: [API documentation](https://developers.telnyx.com/api-reference/messages/send-a-message), [current OpenAPI](https://github.com/team-telnyx/openapi/blob/master/openapi/spec3.json), [v2 API keys](https://support.telnyx.com/en/articles/4305158-api-keys-and-how-to-use-them).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)

Messaging-profile creation requires an explicit `whitelistedDestinations` country allowlist; no destinations are chosen automatically. Legacy profiles without configured destinations also require this field when updated. Text-only MMS is supported. Supplying `mediaUrls`, including an empty array, selects MMS; omit it for SMS.
