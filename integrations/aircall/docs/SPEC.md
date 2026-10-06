# Aircall API contract

The integration uses `https://api.aircall.io/v1` with documented Basic API ID/token or company OAuth authentication. OAuth authorization is `https://dashboard.aircall.io/oauth/authorize`; JSON code exchange is `/oauth/token`, scope `public_api`. Native access tokens do not expire. Basic profile context identifies configured API-key settings. OAuth `/integrations/me` adds actual company/integration IDs; `/company` alone supplies name and counts.

| Tools | Native contract |
| --- | --- |
| list_calls, get_call, manage_call | Exact Int64 call IDs; native page/search and one lifecycle action. Empty 201/204 receipts are acceptance, not confirmed state. Tag array and archive flags are independently read back. Irreversible/delayed media deletion and retained comments are explicit. |
| list_users, get_user, manage_user, start_call | Documented V1 user routes with announced deprecation. ISO creation times and exact extension strings are preserved. User creation sends invitation; deletion is queued. Outbound call creation returns 204 without call ID. |
| list_contacts, get_contact, manage_contact | Native shared contacts and exact phone/email detail IDs. Contact updates POST; detail add/update/delete use phone_details/email_details with 201/202/204 receipts and independent contact readback. |
| list_numbers, manage_team, list_tags | Native number/tag/team discovery; bounded pages. Team lifecycle/membership has routing effects; exact deletion absence is checked without a history-erasure claim. |
| send_message, create_insight_card | Number-specific `{to,body}` message request yields pending native string ID, without delivery proof. Ongoing-call insight JSON stays below 10 KB. |
| get_company, download_call_media | Native auth-mode account context; existing signed MP3 delivery with exact identity-bound renewal and no storage auth forwarding. |

Native page metadata is preserved and checked. The local parser preserves unsafe integral call IDs as exact strings before JavaScript conversion; safe legacy numeric identifiers remain usable. Missing native timestamps/flags are omitted rather than invented. Known connection-secret reflections are sanitized before request trace capture inside the shared HTTP client. Ordinary IDs, metadata, valid native receipts and intentional provider-issued download URLs remain faithful.

All fourteen legacy keys and fields are retained. Numeric call output becomes optional only where Int64 fidelity requires `callIdExact`; missing timestamps/flags and valid empty call-creation receipts require optional legacy fields. No legacy event handlers or replacement subscriptions are registered. No historical message read, Power Dialer administration, invented identity or undocumented refresh API is exposed.

Primary evidence: [complete API reference](https://developers.aircall.io/api-references), [current authentication guide](https://developer.aircall.io/docs/authentication), [current call guide](https://developer.aircall.io/docs/calls), [working with call data](https://developer.aircall.io/docs/work-with-call-data). The [older recording-storage tutorial](https://developers.aircall.io/tutorials/store-recordings-on-dedicated-server) supplies the direct storage-host example; its older ten-minute expiry copy is superseded by the current one-hour API reference and guide.
