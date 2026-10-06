# Storyblok integration

The integration uses the regional Management API, with account Personal Access Tokens or the retained single-space plugin OAuth flow. It does not use Content Delivery tokens, premium multiple-space scoped grants, or image/upload APIs.

| Tools | Supported behavior |
| --- | --- |
| Get Current User, List Spaces | Native identity; regional PAT space discovery or the authorized plugin space |
| Manage Story, List Stories, Get Story | Draft creation, partial updates, exact reads, native search/paging, publication/unpublication, verified active-resource deletion |
| Manage Component, List Components | Schema creation/update, exact reads, native unpaged discovery, deletion |
| Manage Asset, List Assets | Existing asset metadata, privacy/folder changes, native paging, exact reads and active-resource deletion; no upload or file download |
| Manage Datasource, Manage Datasource Entry | Creation, partial updates, exact reads, parent association, paged discovery, deletion |
| Manage Collaborator | Paged current inventory, explicit native role or discovered custom role, invitations and verified removal |
| Manage Release | Native unpaged discovery, exact reads, creation/scheduling, deployment and deletion |
| Get Space Info, List Activities | Exact space, available workflows/stages/roles, paged tags and activities; auxiliary 403 results are omitted with warnings |

All 13 historical tool keys, names and input/output fields remain. Five manage tools add a read action; every space tool accepts an optional explicit numeric space ID. Saved legacy space settings remain a fallback, and newly authorized plugin credentials are restricted to their verified callback space. The two new read tools need no configured space. Historical triggers are removed.

New OAuth connections retain PKCE state, refresh tokens, expiry, callback redirect URI and the native authorized space. Regional token endpoints follow the current official plugin SDK. Older saved tokens retain raw authorization behavior; old OAuth credentials need reconnection for bearer mode and renewal. Both legacy OAuth scopes are requested, and management operations still depend on provider permissions and plan. The premium scoped-grant API is a separate flow.

Native resource envelopes and exact IDs are checked. Publication and deployment use independent native readback. Deletions require a prior exact read and a subsequent genuine 404 or documented deleted-asset state. HTTP 202 and unverified write outcomes require exact readback before retrying. Empty values, false flags and zero parent/folder IDs are preserved where supported. Asset metadata updates merge native metadata and verify requested values without replacing unrelated fields. Scheduled release dates use the provider's wall-clock format with an explicit IANA timezone.

Paged endpoints default to page 1 and 25 items, with a maximum of 1000 except collaborators (100). Totals come from native headers; the required story total is never fabricated. Components, releases and spaces are not assigned undocumented page parameters. Complete collaborator inventories have a finite verification bound and refuse unsafe removal when incomplete.

User-facing errors preserve safe status/remediation while discarding raw transport parents. Results omit credential fields and reject configured credential reflections, including encoded forms. This does not make a universal claim about inherited internal HTTP trace capture before local adaptation.

The active private suite covers all 15 keys. It discovers the exact space, registers cleanup before writes, uses unique ownership markers, reconciles uncertain creation through bounded current inventory, reads ownership before deletion, and deletes children before parents. Writes require explicit dedicated-space and retained-history consent; publication, releases, disposable asset deletion and controlled collaborator invitations have additional gates. Provider history, trash, content references, invitations, email/seat effects and downstream publication effects may remain. No historical erasure or refund is promised.

Current authoritative references:

- [Management API](https://www.storyblok.com/docs/api/management)
- [Plugin OAuth authorization](https://www.storyblok.com/docs/plugins/oauth-authorization-flow)
- [Current OAuth client implementation](https://github.com/storyblok/pluginsblok/blob/main/packages/app-extension-auth/src/storyblok-auth-api/handle-requests/openidClient.ts)
- [Current regional hosts](https://github.com/storyblok/monoblok/blob/main/packages/region-helper/src/index.ts)
- [OAuth user info](https://www.storyblok.com/docs/api/management/oauth/get-user-info) and [space info](https://www.storyblok.com/docs/api/management/oauth/get-space-info)
- [Story search](https://www.storyblok.com/docs/api/management/stories/retrieve-multiple-stories), [creation](https://www.storyblok.com/docs/api/management/stories/create-a-story) and [publication](https://www.storyblok.com/docs/api/management/stories/publish-a-story)
- [Asset object](https://www.storyblok.com/docs/api/management/assets/the-asset-object), [exact asset read](https://www.storyblok.com/docs/api/management/assets/retrieve-one-asset) and [official update client](https://github.com/storyblok/php-management-api-client/blob/main/src/Endpoints/AssetApi.php)
- [Collaborator invitation](https://www.storyblok.com/docs/api/management/collaborators/add-a-collaborator) and [inventory](https://www.storyblok.com/docs/api/management/collaborators/retrieve-multiple-collaborators)
- [Release update/deployment](https://www.storyblok.com/docs/api/management/releases/update-a-release) and [discovery](https://www.storyblok.com/docs/api/management/releases/retrieve-multiple-releases)
