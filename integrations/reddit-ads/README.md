# Reddit Ads

Manage Standard advertising resources, discover account and Pixel IDs, read performance reports, manage supported custom audiences, and submit conversion events.

## Connect and select an account

- **OAuth 2.0** requests `adsread` and `adsedit` for advertising management.
- **Conversion OAuth** requests `adsread` and `adsconversions` for account/Pixel discovery and conversion submission; it does not grant advertising-edit permission.
- **Conversion Access Token** supports a business-admin-issued static conversion token. It has no documented identity-read permission; verify its business and Pixel in Events Manager. No invented identity request is made.

OAuth uses Reddit's documented Ads authorization URL, permanent authorization, Basic-authenticated token exchange and refresh. Member and System User identity come from `GET /api/v3/me`; System Users have no human profile fields. The old OAuth URL and authorizations remain supported by Reddit. Unused `history` is excluded from new grants. Token refresh preserves the stored refresh token when Reddit omits a replacement.

New connections do not require an opaque account ID in configuration. `list_ad_accounts` first lists businesses; pass a returned `businessId` to query its account IDs. Supply `accountId` to management tools. Already-stored legacy account configuration remains a fallback. No business or account is chosen automatically.

## Tools

| Tools | Behavior |
| --- | --- |
| `get_account_info`, `list_ad_accounts`, `list_pixels` | Exact actor/account identity and scoped discovery. Funding is one optional page; set `includeFunding:false` when billing-read access is unavailable. Approval state is not fabricated as account status. |
| `list_campaigns`, `list_ad_groups`, `list_ads`, `list_custom_audiences` | One page, with `nextUrl` and `hasMore`. Continue with the same account and filters. Campaign status filtering is applied to that page; DRAFT is unsupported. |
| `get_resource` | Exact account-scoped campaign, ad-group, ad or audience readback, including configured/effective state and relationship IDs. |
| `manage_campaign` | Create/update Standard campaigns. Creation requires name, objective and explicit status. DAILY campaign budgets require explicit CBO and its Pixel, schedule, goal and bidding fields. Non-CBO LIFETIME budget is a campaign spend cap. Budget mode/type are immutable. |
| `manage_ad_group` | Create/update Standard ad groups with verified parent account, required Pixel and current bidding fields. Legacy `bidStrategy` means bid type; `optimizationStrategy` is distinct. Targeting maps to communities/interests/keywords/locations and preserves other targeting fields on update. |
| `manage_ad` | Create/update ads using an existing creative `postId`. Direct legacy headline/body/call-to-action/media fields fail with remediation; create the creative in Ads Manager. No speculative creative job is created. |
| `get_performance_report` | Documented metric names and dimensions, UTC midnight date boundaries, one page and continuation. Entity-ID filters are combined with OR. Metrics retain provider units. UTC is default; `timeZoneId` applies to date dimensions. |
| `manage_custom_audience` | Create customer-list, website (`PIXEL_RETARGETING`) and engagement (`ENGAGEMENT_RETARGETING`) audiences with required configuration. Metadata update, description and LOOKALIKE creation are unsupported and fail locally. Size ranges are not turned into invented exact counts. |
| `manage_audience_users` | 1–2500 complete rows of lowercase SHA-256 identifiers for an account-scoped customer list. HTTP204 is acknowledged; `usersSubmitted` is reported, and no processed-user count or completed matching is invented. |
| `delete_custom_audience` | Pre-read exact account association and accept documented HTTP204 deletion. Does not claim historic data erasure. |
| `send_conversion_events` | Explicit CAPI version, hashed or plain documented match keys, bounded event age, zero-safe values and truthful receipt. Does not claim attribution/deduplication completion. |

Advertising monetary inputs remain **cents of the account currency**. They convert to integer microcurrency using `cents × 10,000`; unsafe or fractional cent inputs are rejected. Returned microcurrency converts back without dropping zeros. Conversion `valueDecimal` remains an amount in **base currency units**, with no cents conversion. IDs remain strings and unsafe provider integer values are rejected.

## Version and effect limits

Management uses current v3 paths, `{data:...}` bodies and PATCH updates. The September 2026 objective migration retains documented old enums such as CONVERSIONS and CATALOG_SALES, while introducing current values. The original TRAFFIC, VIDEO_VIEWS, REACH and ENGAGEMENT strings have no documented API enum mapping and fail explicitly; choose CLICKS/IMPRESSIONS/VIDEO_VIEWABLE_IMPRESSIONS or an appropriate current objective deliberately. CPA is not a current ad-group bid type.

Campaign/ad-group/ad creation requires an explicit status. **ACTIVE can enable advertising spend.** PAUSED is required for controlled testing. ARCHIVED and DELETED are retained provider states, not record erasure. Changing a parent or a CBO-inherited bid/budget is rejected rather than silently changing delivery intent.

Reddit's current CAPI migration guide says both versions accept events and existing bearer tokens remain valid. New static-token and Conversion OAuth connections default to v3; old unmarked connections retain v2. `apiVersion` selects explicitly. v3 requires `actionSource`, sends epoch milliseconds, uppercase tracking types, nested `data`, `type` and `metadata`, and accepts up to 1,000 events. Legacy v2 retains the old endpoint and payload conventions, with the existing 500-event tool limit. `testId` is v3-only. Do not dual-send or automatically retry an uncertain ingestion. Receipt `eventsSent` counts submitted events after an HTTP acknowledgment; it is not a verified per-event attribution count.

Conversion events and audience membership have irreversible effects. Use Events Testing and isolated synthetic sources only with explicit authorization. No event/history rollback is claimed. Reports using HOUR for more than seven days and some breakdown combinations change on December 8, 2026; review Reddit's migration guide before that date.

## Official sources

- [Current API and authentication](https://ads-api.reddit.com/docs/v3/api/reddit-advertising-api)
- [System User authorization](https://ads-api.reddit.com/docs/v3/guides/programs/business/system-users)
- [Standard campaign setup](https://ads-api.reddit.com/docs/v3/guides/programs/campaign/campaign-setup)
- [Objective migration](https://ads-api.reddit.com/docs/v3/guides/programs/campaign/campaign-objective-migration)
- [Report filters](https://ads-api.reddit.com/docs/v3/guides/programs/reporting/filter-metrics)
- [CAPI migration](https://ads-api.reddit.com/docs/v3/guides/programs/capi/migration)
- [CAPI payloads and hashing](https://ads-api.reddit.com/docs/v3/guides/programs/capi/direct-integration)
