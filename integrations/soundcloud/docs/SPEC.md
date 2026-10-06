# SoundCloud API contract

The API root is `https://api.soundcloud.com`; authenticated resource requests use `Authorization: OAuth <access_token>`. No automatic redirects or retries are enabled. User operations require OAuth; known Client Credentials mode is refused before user requests. Older outputs without a mode retain native authorization-failure behavior.

Authorization uses `https://secure.soundcloud.com/authorize` with state and S256 PKCE. Form token exchanges use `/oauth/token`; Client Credentials authenticates with UTF-8 HTTP Basic `client_id:client_secret`. Both modes keep native `expires_in` and single-use rotated refresh tokens. No fictional scopes, fixed expiry or application user identity is supplied.

All 26 retained tools use the current documented resource contracts. Likes use `/likes/{tracks|playlists}/{urn}`; reposts use `/reposts/{tracks|playlists}/{urn}`; follow uses PUT `/me/followings/{urn}`. Comments use JSON `{comment:{body,timestamp}}`. Playlist writes use `{playlist:{tracks:[{urn}],set_type,...}}`, with legacy `isAlbum` mapped to native `set_type`. Track metadata updates use `{track:{...}}`; upload uses multipart audio. Documented numeric path aliases remain accepted, while outputs identify URNs.

Linked lists preserve `collection` and exact native `next_href` end semantics. Continuations must stay on the same HTTPS API origin and resource path, without credential query parameters. Empty or short pages do not invent totals or end markers. Local bounds are 1,000 records per response and 10 pages/1,000 records for relationship absence checks, not provider caps. Profile lists have separate continuation inputs. Embedded playlist tracks may be incomplete; `listTracks` uses the dedicated track collection.

Resolve supports the documented 302 Location or body location with one manually validated API resource request. Stream records preserve native format-to-resolver URLs. Original-file delivery only follows the exact native enabled download URL bound to the track and accepted API origin; unknown expiry falls back to bounded content. No CDN authentication, automatic redirect, stream conversion or renewal is inferred.

Native optional fields and nulls are preserved. Country names are not relabeled as country codes. Legacy favorites count is used only when native likes count is absent. Native URN-only resources do not require obsolete numeric IDs.

Success receipts validate exact resource IDs and requested documented fields. Relationship mutations require fresh native state. Requested playlist membership must be complete before it is asserted. Partial effects and concurrency remain possible; there is no atomicity or history-erasure claim. Comment deletion is undocumented and unsupported.

Primary references: [OpenAPI](https://github.com/soundcloud/api/blob/master/openapi/api.yaml), [API guide](https://developers.soundcloud.com/docs/api/guide), [OAuth migration](https://developers.soundcloud.com/blog/oauth-migration/), [URN migration](https://developers.soundcloud.com/blog/urn-num-to-string/), [optional track fields](https://developers.soundcloud.com/blog/soundclouds-new-api-track-object/), [oEmbed](https://developers.soundcloud.com/docs/oembed).
