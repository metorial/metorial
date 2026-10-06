# Roam Research integration

This package uses the hosted Backend API, not the unrelated Roam HQ API or the desktop-local API. The [vendor backend SDK](https://github.com/Roam-Research/backend-sdks/tree/master/typescript) and its [native implementation](https://github.com/Roam-Research/backend-sdks/blob/master/typescript/src/index.ts) are the authoritative wire evidence. The [vendor documentation graph](https://roamresearch.com/#/app/developer-documentation/page/tIaOPdXCj) requires the JavaScript app; unauthenticated text retrieval did not expose its page contents. No current service acceptance is inferred from documentation availability.

## Connection

Retain api_token.apiToken and graphName configuration for existing connections. The graph name is visible in its Roam URL, not an undiscoverable tenant ID. Backend graph tokens are graph-scoped; use read-only for reads and read+edit for writes on a non-encrypted hosted graph. No verified profile, self endpoint, OAuth refresh, graph discovery, local desktop transport or append-only behavior is invented. The API uses POST under https://api.roamresearch.com/api/graph/{encodedGraphName}, with X-Authorization: Bearer. Documented routing to HTTPS peer-N.api.roamresearch.com is followed only with the same exact graph/action path, within two hops; credentials are not forwarded to other destinations.

## Retained capabilities and essential reads

The thirteen retained keys cover query_graph, pull_data, get_page, create_page, update_page, delete_page, create_block, update_block, move_block, delete_block, add_daily_note, search_blocks and batch_actions. Added get_block reads an exact UID with native metadata, and list_pages discovers title/UID pairs via q. list_pages uses a local sorted output cap and truthfully exposes truncation; there is no native cursor or guaranteed full-graph inventory. search_blocks retains case-sensitive parameterized Datalog substring semantics rather than silently switching to ranked search.

Native q/pull responses require the result envelope, including null for absent pulls. Title lookups escape EDN strings. Scalar content, false, heading 0 and explicit empty query arguments remain intact. Write actions use the native create/move/update/delete page/block shapes. The existing batch key adds the documented update-page branch; local limits are 100 actions and 1 MiB JSON.

Create operations assign a UID before sending when none is supplied, retain it in recovery guidance and confirm exact native outcomes. Updates/moves/deletions pre-read the exact target and check the requested outcome afterward. An already absent delete returns success false without sending another write. Write acceptance is distinct from unresolved readback; a failure may leave changes or part of a batch behind, and no write is automatically retried. Deletion does not erase retained history, logs or backups. Batch verification retains earlier requested fields unless a later action replaces them or deletes/recreates the target, and checks the final parent and position. Conflicting later sibling edits can leave position confirmation unresolved. It does not promise rollback or verify every intermediate state.

add_daily_note defaults to today's UTC MM-DD-YYYY UID and verifies a real calendar date. The exact daily page must already exist; open or create it in Roam first. This replaces the unsupported previous auto-create promise without inventing a daily page title.

## Page JSON

get_page optionally generates JSON from its exact native page read, within an 8 MiB bound. This is a page file, not a full graph backup or native export job. No provider file download or expiry/renewal contract is claimed. There are no triggers or replacement groups.
