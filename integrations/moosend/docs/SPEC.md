# Moosend integration

The supported surface is the documented Moosend v3 JSON API at `https://api.moosend.com/v3`. Authentication uses an API key query parameter. An owner/admin can obtain the real key from account settings. Configuration remains empty and stored authentication remains `{ token }`.

| Tools | Capability |
| --- | --- |
| `create_campaign`, `get_campaigns`, `update_campaign`, `delete_campaign` | Draft creation, list/detail discovery, content-preserving edits, clone and delete |
| `send_campaign` | Immediate/scheduled sending, schedule assignment/removal and controlled test send |
| `campaign_analytics` | Summary, A/B summary, activity pages, links and locations |
| `manage_mailing_list` | List lifecycle/discovery and optional preferences |
| `manage_subscriber`, `list_subscribers` | Single/bulk subscribe, update, unsubscribe, archive and paginated status reads |
| `manage_custom_field` | Field lifecycle and supported type aliases |
| `manage_segment` | Segment lifecycle, criteria writes and subscriber reads |
| `send_transactional_email` | Template/content-based transactional messages with partial acceptance receipts |
| `get_senders` | Sender discovery, enabled/verified state and domain-authentication status |

All 12 previous keys and input field types are retained. `get_senders` is the sole addition. No triggers are registered. There is no verified suitable current-user/account REST lookup in the reviewed documentation; sender records are not treated as user identity.

Responses use `Code`/`Error`/`Context`, except documented bare transactional acceptance receipts. HTTP success alone does not establish provider success. Create campaign/list/custom-field receipts are scalar IDs; segment IDs can be numeric; clone returns a campaign object. Missing IDs are rejected. Bulk acceptance and archive results report partial failure accurately. Optional timestamps and values omit provider nulls; zero and false values are retained.

Lists/campaigns/statistics validate positive integral pages and page sizes up to 1000. The segment-list endpoint documents paging metadata without a page selector; returned and total counts make incomplete results visible. Statistics dates map legacy `YYYY-MM-DD` to documented `DD-MM-YYYY` without time truncation. Legacy `Forward` statistics and subscriber `since` inputs remain in schemas with explicit unsupported-input validation. `Subject` maps to `Subjectline`; custom-field `Decimal`/`Integer` map to `Number`.

Draft updates pre-read required names and preserve omitted content, reply/confirmation addresses and recipient list/segment relationships. List updates preserve omitted preference options. Custom-field updates hydrate the required name, type and required flag. Existing visibility is preserved when reported; otherwise an update requires an explicit isHidden choice because omission defaults to visible. A verified no-op does not send an update. Dropdown updates require all options because the provider's XML definition cannot be replayed as request options. Segment updates preserve omitted match type and existing audience caps. Unavailable settings cause explicit validation before a write. Provider readback failure after an accepted write reports the accepted resource ID and warns against blind retries.

Scheduling assigns a date and requires a separate send request to queue delivery. Unscheduling a queued campaign may send immediately. Upserts can resubscribe and clear omitted custom-field values. Unsubscribe behavior follows account settings; remove archives records. Transactional sends explicitly apply the caller's unsubscribe-bypass choice, defaulting to false. Acceptance counts do not establish delivery. No operation promises history erasure.

Official sources: [API introduction](https://docs.moosend.com/api-documentation/articles/KnowledgeBase/54561-Introduction-to-the-Moosend-API?lang=en_US), [authentication](https://docs.moosend.com/api-documentation/articles/KnowledgeBase/54552-Authenticate-a-Moosend-API-request?lang=en_US), [sender discovery](https://docs.moosend.com/api-documentation/articles/KnowledgeBase/54594-Get-all-senders?lang=en_US), [transactional sending](https://docs.moosend.com/api-documentation/articles/KnowledgeBase/54597-Manage-a-transactional-campaign?lang=en_US).
