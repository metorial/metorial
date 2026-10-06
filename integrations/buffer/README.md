# Buffer

Discover organizations and connected channels, read posts and posting schedules, create unpublished drafts or scheduled posts, edit and delete unpublished posts, publish an existing queued post, and move a queued post to the top. Current service configuration and queue positioning are experimental API capabilities.

Connect a personal Buffer API key or a current OAuth application. OAuth uses PKCE and rotating refresh tokens, with account read and post read/write scopes. Post metrics require a personal API key and an explicit `includeMetrics` request. There is no required organization configuration: discover IDs with Get Organizations.

Existing stored credentials without an API version marker continue to use the legacy REST API. Reconnect to migrate; credentials are never silently tried against the other API after an error. Legacy tool keys and input fields remain available. The current API does not document whole-queue reorder/shuffle, schedule changes, individual interaction records or network-wide URL share counts. Their retained REST routes have not been verified against a live legacy account; this does not imply a provider shutdown.

Use `saveToDraft: true` to create an unpublished draft. Omitting it retains the original publishing-queue behavior; `now: true` publishes immediately. Multiple profiles are processed separately and creation is not atomic. Read back any unconfirmed operation before retrying. Media photo URLs map to image assets; legacy link-preview fields require explicit current network metadata instead. Omitted edit fields preserve content and scheduling; an explicit empty assets array clears files.

Current post lists use `after` cursors and return page information without a total count. `returnedCount` describes this response only. Missing counts and nullable/unavailable account or post fields are omitted rather than fabricated. Channel reads expose the actual social-account identifier, timezone and paused-queue flag. Date fields retain Unix seconds where the original tools use numeric timestamps. Deleting a Buffer update does not withdraw a published social post.

Official references: [API reference](https://developers.buffer.com/reference.html), [authentication](https://developers.buffer.com/guides/authentication.html), [REST migration](https://developers.buffer.com/guides/rest-migration.html), [pagination](https://developers.buffer.com/guides/pagination.html).
