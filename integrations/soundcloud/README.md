# SoundCloud

Search tracks, playlists and users; read profiles, comments and native relationship state; manage authorized tracks, playlists, follows, likes, reposts and comments. The 26 public tools retain their existing keys and inputs.

Use OAuth to act as a user. Client Credentials accesses public resources and does not identify a SoundCloud user. Both token modes preserve native expiry and rotated refresh tokens; refresh tokens are single-use. If a refresh response omits a distinct replacement, reconnect rather than retrying the potentially consumed grant.

Lists return native `nextHref` continuations. Profile lists accept separate continuations with their matching include flags. Playlist track listing is explicit because embedded tracks can be incomplete. Numeric string IDs remain supported aliases; outputs and playlist payloads use native URNs. Missing or null native statistics stay missing or null.

`get_track` can return native stream resolver URLs and an enabled original download. Streaming URLs are not original downloads. Original delivery requires a native URL identifying that exact track on the HTTPS API origin, rejects redirects, and reads at most 16 MiB. Unknown URL expiry uses bounded file content; there is no renewal promise. Other native download hosts require separate verified support. Uploads accept canonical base64 audio up to the local 64 MiB bound and artwork up to 8 MiB.

Playlist track updates replace the supplied membership; there is no compare-and-swap guarantee. Mutations and subsequent readbacks can fail separately after an effect. Reconcile native state before retrying. Track/playlist deletion is permanent; deletion does not promise erasure of history. Current public documentation supplies no comment deletion route, so comment and notification effects can remain.

The private suite is active and requires explicit controlled fixtures and original-credential binding. A dedicated empty private playlist lifecycle has fresh ownership/state and complete inventory cleanup checks. Upload, comment and existing-resource mutations are gated before effects where complete native cleanup evidence is unavailable. No live provider acceptance is claimed.

Sources: [API guide](https://developers.soundcloud.com/docs/api/guide), [official OpenAPI](https://github.com/soundcloud/api/blob/master/openapi/api.yaml), [OAuth migration](https://developers.soundcloud.com/blog/oauth-migration/), [URN migration](https://developers.soundcloud.com/blog/urn-num-to-string/), [oEmbed](https://developers.soundcloud.com/docs/oembed).

Licensed under [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
