# Reddit Ads API coverage

This integration exposes 16 tools: the 12 original keys plus `list_ad_accounts`, `list_pixels`, `get_resource` and `delete_custom_audience`. See [README](../README.md) for exact version, scope, compatibility and effect limits.

Management requests use `https://ads-api.reddit.com/api/v3` with Bearer authentication, 30-second timeout, no redirects, no automatic write retries, validated identities and credential-free error ancestry. Read responses are checked and credential metadata is omitted from retained raw fields; actual credential echoes and unsafe numbers fail safely.

| Capability | Provider route/method |
| --- | --- |
| Authenticated actor | `GET /me` |
| Business discovery | `GET /me/businesses` |
| Account discovery | `POST /businesses/{businessId}/ad_accounts/query` |
| Account, funding, Pixels | `GET /ad_accounts/{accountId}`, `/funding_instruments`, `/pixels` |
| Campaign/ad-group/ad/audience list/create | `GET`/`POST /ad_accounts/{accountId}/{campaigns,ad_groups,ads,custom_audiences}` |
| Exact resource read | `GET /{campaigns,ad_groups,ads,custom_audiences}/{id}` |
| Campaign/ad-group/ad update | `PATCH /{campaigns,ad_groups,ads}/{id}` |
| Audience membership | `PATCH /custom_audiences/{id}/users`, HTTP 204 |
| Audience delete | `DELETE /custom_audiences/{id}`, HTTP 204 |
| Reports | `POST /ad_accounts/{accountId}/reports` |
| CAPIv3 | `POST /pixels/{pixelId}/conversion_events` |
| Compatibility CAPIv2 | `POST /api/v2.0/conversions/events/{pixelId}` |

JSON management bodies are wrapped in `data`; v2 conversion bodies are not. Every list/report is one page. Follow returned validated same-endpoint URLs directly, keeping POST bodies and filters unchanged. Never infer offset/page indexes or totals.

No custom-audience metadata-update method is documented. No direct creative-text/media payload, speculative structured-post job, lookalike creation, catalog upload, billing mutation or data-deletion workflow is claimed. Old unsupported fields/enum values remain present in schemas with explicit remediation errors. Legacy output fields remain; `usersProcessed` is optional because the documented acknowledgment supplies no count.

The active private suite requires exact controlled account/actor/business fixtures and independently verifies provider identity/readbacks. Paused advertising writes acknowledge retained DELETED state; uncertain creates are reconciled by unique marker, timestamp, account and parent proof before cleanup. Unresolved children preserve parents. Conversion-only credentials cannot independently prove actor/Pixel identity; conversion live testing uses the separate read-capable conversion OAuth method, a synthetic Pixel, testId and explicit irreversible-history gates. No live verification is claimed without an actual authenticated run.
