# Contentful

Twenty tools cover localized entries and assets, content types, tags, discovery, incremental sync, scheduling, and Release.v1 groups. Existing seventeen tool keys and their fields remain available.

Use a CMA PAT or an externally obtained Contentful OAuth management token for writes, current-user identity, and space discovery. Delivery and Preview keys are separate read credentials; production Delivery keys also support sync. Preview credentials use the documented preview host, including EU data residency. Select the region when connecting. Legacy saved `region` remains a validated fallback; remove a conflicting saved region when reconnecting. Legacy token-only read connections can select their API explicitly, or reconnect to save the credential type. A known credential cannot be sent to a different API.

Space and environment defaults are optional. Use `list_spaces` and `list_environments`, then pass the exact selection on each tool. Delivery/Preview users obtain their space ID from API-key settings. An environment alias whose returned binding differs must be replaced with its resolved environment ID.

Contentful OAuth itself is available. Its documented flow returns a token in the redirect fragment. The current connection callback accepts authorization codes, so new OAuth authorization and guessed code/refresh exchanges are refused with token reconnection guidance. Existing stored CMA OAuth tokens remain usable. No new OAuth token endpoint is invented.

Writes use native optimistic version headers without automatic retries. Entry updates replace the complete fields object and preserve current metadata. Asset processing is asynchronous: `processAndPublish` publishes only after all requested locales have processed URLs; a pending result preserves the existing asset ID. Later creation/update failures provide exact resource recovery information instead of hiding an already created object.

Lists expose native page metadata. Releases and scheduled actions use exact next-page URLs. Sync returns one page, a `nextPageToken` while incomplete, and a `nextSyncToken` only when that sync is complete. Do not discard locally stored content or start another initial sync merely because a page remains.

Release publish/unpublish return an accepted asynchronous action with its ID and status; use `manage_release` with `action:get` and `releaseActionId` to inspect completion. Creation supports documented Release.v1 direct Entry/Asset links, at most 200 unique entities. The legacy `description` input is retained but refused before creation because current API and official SDK payloads do not support it. Release.v2 and locale-based release editing are outside this surface.

`download_asset` delivers the public original for the exact asset and locale from `get_asset`; it never chooses a fallback or fabricates a URL/signature. Secure/embargoed assets need a separately configured asset-key delivery workflow. Native public CDN URLs have no invented expiry or renewal. Metadata URLs are not evidence that private file delivery succeeded.

Canceling a scheduled action retains its canceled record. Scheduling can send failure email and trigger automation. Deleting a release permanently removes its linked action records. Asset deletion removes the API object, but referenced CDN files can remain cached for up to 48 hours. History, audit, webhooks, external copies, and automation effects cannot be undone by cleanup.

The active private suite requires explicit isolated-resource and retained-effects consent for mutations. Source/schema/SDK checks do not establish live provider acceptance; no provider calls were performed during this refresh.

Sources: [CMA](https://www.contentful.com/developers/docs/references/content-management-api/overview/), [authentication](https://www.contentful.com/developers/docs/references/authentication/), [OAuth](https://www.contentful.com/developers/docs/extensibility/oauth/), [EU hosts](https://www.contentful.com/developers/docs/platform/eu-data-residency/), [releases](https://www.contentful.com/developers/docs/references/content-management-api/releases/), [sync](https://www.contentful.com/developers/docs/references/content-delivery-api/synchronization/).
