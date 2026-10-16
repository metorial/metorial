# ToneDen API integration

Verified against the official [documentation index](https://developers.toneden.io/llms.txt) and its endpoint OpenAPI definitions on October 15, 2026. ToneDen exposes one marketing API at `https://www.toneden.io/api/v1`, with advertising campaigns, FanLinks, social unlocks, contests, playbook campaigns, profiles, user lists, and offline conversions. These are resource families within the same product.

## Authentication and identity

The [getting-started guide](https://developers.toneden.io/docs/getting-started) documents authorization-code OAuth, a JSON token exchange at `/auth/oauth2/token`, and bearer authentication. Register an application in Developer Settings, save its client secret, and obtain ToneDen's application approval. The documented token response contains `access_token` and `token_type`; no expiry or refresh-token grant is specified. The existing OAuth method and its saved bearer-token field are retained. Its existing `full` scope declaration is retained for compatibility; the current guide does not document a scope parameter or a scope catalog.

Authorizations are [scoped to the selected artist profile](https://developers.toneden.io/docs/user-account-structure). Multiple profiles need separate connections. `get_profile` uses the documented [`GET /users/me`](https://developers.toneden.io/reference/get_users-userid) identity operation when no user ID is supplied, and can look up a supplied numeric user ID. There are no resource IDs or duplicate auth settings in connection configuration.

## Capability map

| Tools | Documented operations |
| --- | --- |
| `list_campaigns`, `manage_campaign` | `GET /users/{userID}/advertising/campaigns`; `GET`, `PUT`, `DELETE /advertising/campaigns/{campaignID}`; `POST /advertising/campaigns` |
| `campaign_insights` | `GET /advertising/campaigns/{campaignID}/insights` and `/creativeInsights` |
| `list_links`, `manage_link` | `GET /users/{userID}/links`; `GET`, `PUT`, `DELETE /links/{linkID}`; `POST /links`; `GET /links/expand` and `/links/validPath` |
| `link_insights` | `GET /links/{linkID}/insights` and `/insights/overview` |
| `list_attachments`, `manage_attachment` | `GET /users/{userID}/attachments`; `GET`, `PUT`, `DELETE /attachments/{attachmentID}`; `POST /attachments` |
| `attachment_insights` | Attachment `/entries`, `/entries/totals`, `/unlocks`, `/unlocks/totals`, and `/unlocks/platforms` |
| `manage_playbook` | `GET`, `PUT`, `DELETE /playbooks/campaigns/{campaignID}`; `POST /playbooks/campaigns` |
| `manage_user_list` | `GET /users/{userID}/advertising/userLists`; `POST /advertising/userLists`; `POST /advertising/userLists/{listID}/contacts` |
| `upload_offline_conversions` | `POST /users/{userID}/advertising/offlineConversions` |
| `get_profile`, `update_profile` | `GET`, `PUT /users/{userID}` |

All endpoint families in the official reference are already covered by these fourteen tools. No additional endpoint or duplicate identity tool is inferred. The current index does not document webhook registration or subscription endpoints.

## Request and response details

- List tools return a single page using optional `offset` and `limit`. The official definitions declare integer pagination, an offset default of zero, and no limit maximum. Existing number input contracts and omission behavior are preserved; defaults are left to the provider. Existing profile-list paths continue to use `me` for compatibility, although list endpoint definitions describe numeric `userID` and only the user-detail endpoint explicitly documents `me`.
- [Campaign requests](https://developers.toneden.io/reference/post_advertising-campaigns) support optional archiving, report emails, and notification controls. `providerAudiences` accepts the documented provider object format without imposing the legacy `audiences[].type` field. The legacy `audiences` field retains precedence and its schema. Budgets use the lowest currency denomination, and schedules use UNIX timestamps. Existing omitted/falsy-field construction is preserved.
- [Campaign insight intervals](https://developers.toneden.io/reference/get_advertising-campaigns-campaignid-insights) contain aggregate statistics under each interval's `total` key and additional audience-ID keys. Normalized totals read that aggregate with a fallback for an already returned legacy direct-stat object. Original intervals and creative-level objects are retained as optional raw metadata, including audience statistics, preview/editor URLs, review feedback, and creative objects.
- [Link requests](https://developers.toneden.io/reference/post_links) support author, saved-service preference, preview autoplay, event date/location/price, and music ISRC/UPC for rescans. The additive `musicIsrc` and `musicUpc` write fields leave the original expand-only `isrc` and `upc` meanings intact. Full link metadata preserves generated service arrays and actual provider URLs without constructing URL guesses. Path validation additionally exposes the rejected provider field and complete validation result.
- [Offline conversion uploads](https://developers.toneden.io/reference/post_users-userid-advertising-offlineconversions) send the documented root JSON array, without a `conversions` wrapper. Contact matching accepts the documented external user ID and location fields. Existing event enums, timestamps, optional values, and normalized success outputs are preserved.
- [User-list contact updates](https://developers.toneden.io/reference/post_advertising-userlists-listid-contacts) support optional external user IDs alongside the existing contact fields. ToneDen documents support approval for user-list access.
- Existing resource fields, requiredness, types, enums, raw values, boolean false values, zeros, and string omission behavior are preserved. Optional raw metadata supplements normalized fields. Absent insight counts are described as unavailable rather than invented zero values.
- API and OAuth transport failures use structured errors with ToneDen's upstream status and response-body messages. Existing structured errors pass through unchanged. Existing action validation retains its conditions and now uses structured errors.

## Limits and verification

The published response schemas do not mark most resource properties required, and an expanded link is a template. Existing normalized required fields remain unchanged because there is no verified provider sample establishing which fields are actually absent. In particular, whether `/links/expand` returns an ID is unverified; no ID is invented and no required output is relaxed speculatively. Social-unlock reward/platform fields already accepted by the integration remain supported for compatibility even where the reference's generic attachment schema omits those subtype details.

This refresh was checked with package build/type checking, scoped formatting/lint, original-schema comparison, and the required object-root schema regression test. No authenticated provider calls, live E2E, or tool-use evaluations were performed. API acceptance, provider plan permissions, current production availability, and real OAuth behavior remain unverified.
