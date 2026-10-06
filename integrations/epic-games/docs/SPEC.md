# Epic Games developer services

The integration exposes 13 actions: the 12 retained legacy keys and `get_connection_context`. It targets official Epic Account and EOS game-service APIs, not undocumented consumer account management, purchases, achievements, cloud saves, lobbies or arbitrary game actions.

## Authentication and context

Epic Account OAuth requests `basic_profile` and `friends_list`. Refresh tokens depend on the native client configuration; no undocumented `offline_access` scope or unused presence scope is requested. Missing refresh credentials require reconnection. `/epic/oauth/v2/tokenInfo` verifies account/client context without returning the token.

EOS client credentials request `/auth/v1/oauth/token`, optionally for an authorized deployment, and renew through the same documented grant. Organization/product/sandbox/deployment/features come from that grant and do not imply a player identity or current introspection. Deployment belongs to authentication; old stored config values are validated compatibility fallbacks. No deployment-discovery route is invented.

## Native behavior

Identity and account lookups use repeated query keys and omit unresolved/unconsented IDs. Sanction reads expose native paging; active sanction pagination is an explicitly local slice. Compact numeric epoch-second timestamps become ISO strings to retain the legacy output type; native nullable display names remain null.

Sanction create/update receipts bind exact records. Removal sends `{referenceIds, justification?}` and handles native204 without fabricating records or erasing history. Player reports accept native201, retain moderation history and do not prove disciplinary completion. Report searches expose one native offset page.

Ownership and entitlements preserve native arrays and identifier semantics. Redemption reports acceptance, not in-game delivery, and cannot be undone. Ownership and entitlement batches support at most100 identifiers as an integration execution bound, not a stated provider maximum.

Voice join binds exact room/deployment/participants and returns intended per-player tokens. Only the corresponding player may receive each token; token issuance is distinct from joining. Remove/mute handle native204 and disclose completed versus failed/unattempted participants without rollback. Participant batches are bounded at100. Anti-cheat reads the deployment’s server-kick configuration, not per-player health.

`get_friends` preserves the existing `/epic/friends/v1` compatibility paths and input/output schemas. Current official SDK docs describe friends functionality; no current official HTTP contract was located and no live acceptance was verified. This is not evidence of retirement. Use Epic’s supported SDK when implementing a game’s friends integration.

## Verification limits

The private suite stays active for exact authorized account/game-service read fixtures and independently compares native envelopes and paging. Four effectful scenarios gate before writes because complete downstream/restoration proof is unavailable: sanctions/history, reports without deletion, irreversible redemption, and voice without complete membership/revocation observation. No provider effects or live verification occurred during this refresh. Offline wire/schema/protocol evidence does not prove application entitlement, permission grants, native normalization or upstream acceptance.

Credential screening is bounded to tested literal, URI, Unicode, Base64 and hex reflections of known connection secrets. It is not a universal privacy guarantee. Native voice tokens are purposeful outputs. Shared pre-adapter trace retention is assessed separately from public outputs/errors; no shared transport behavior is changed.

## Official sources

- [Web API introduction](https://dev.epicgames.com/docs/web-api-ref/web-api-introduction)
- [Auth Web APIs](https://dev.epicgames.com/docs/web-api-ref/authentication)
- [Connect Web API](https://dev.epicgames.com/docs/web-api-ref/connect-web-api)
- [Sanctions Web APIs](https://dev.epicgames.com/docs/web-api-ref/sanctions-web-apis)
- [Player Reports Web APIs](https://dev.epicgames.com/docs/web-api-ref/player-reports-web-apis)
- [Ecom Web APIs](https://dev.epicgames.com/docs/web-api-ref/ecom-web-apis)
- [Voice Web API](https://dev.epicgames.com/docs/web-api-ref/voice-web-api)
- [Anti-Cheat Web APIs](https://dev.epicgames.com/docs/web-api-ref/anti-cheat-web-apis)
- [Official friends SDK example](https://github.com/EpicGames/EOS-Getting-Started)
