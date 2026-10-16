# Beeminder integration

The integration exposes eleven tools for authenticated profile lookup, active or archived goal discovery, goal creation and settings, pledge and safety-buffer actions, datapoint creation/listing/update/deletion, and monetary charges.

API contract: [official Beeminder API reference](https://api.beeminder.com/).

Personal tokens use `auth_token`; OAuth tokens use `access_token`. OAuth authorization returns its token directly in the callback query. No expiring-token or refresh-token flow is documented. Newly authorized connections store their auth method and resolved username. Legacy OAuth connections retain the stored `me` username behavior.

Existing public fields and types are retained. Optional additions cover incremental user reads, associated goals, compact responses, goal datapoints, graph bounds, data sources, dry-run goal creation, ratchet confirmation, and provider sort attributes. All existing required output fields remain required. Missing or invalid required provider values cause a structured error; optional summaries omit provider nulls while complete provider values remain in `raw`.

Refresh is asynchronous: its boolean queue result is exposed as `refreshQueued`, and the tool then retrieves current goal details. This does not prove the refresh has finished. Short-circuit charges the pledge and raises its level; Uncle derails and immediately charges the owner and Groupies. Ratcheting to zero requires explicit `beemergency: true`; a scheduled break can leave more buffer than requested.

Datapoint sort directions remain `asc` and `desc`. They are translated to provider attribute sorting, using timestamp when a direction is supplied. Ascending reads fetch the full list and sort before applying local pagination. Provider pagination uses descending attribute order; `count` is ignored with `page`, and `per` is ignored without `page`. Batch creation preserves successful datapoints and provider errors separately. Identical request IDs can return the provider's duplicate-datapoint error rather than a new object.

Tags and road matrices are sent as arrays. Existing `pledge` creation, callback URL update, and datapoint `daystamp` update inputs remain available for compatibility, but are not enumerated in the current endpoint parameter lists. No goal archive/delete API is documented. No triggers or file download tools are declared; graph URLs are resource metadata.

Local build and schema checks do not establish live provider acceptance, OAuth callback compatibility, asynchronous completion, or charging behavior. No live requests, E2E, or evals are part of this refresh.
