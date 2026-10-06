# Tally implementation contract

The supported public scope is the original thirteen tool keys plus exact workspace readback and submission PDF download. Legacy triggers were removed without replacements. There are no organization, folder, webhook or general file administration additions.

## API fidelity

The client sends `tally-version: 2026-08-04` to `https://api.tally.so`, Bearer authorization, a 30-second timeout and no redirects. Exact IDs reject paths, control characters and malformed Unicode. Native objects and list envelopes are validated before mapping; inconsistent accepted write replies report uncertainty and require inspection before retrying.

- Forms use native `id`, `name`, `workspaceId`, state, counts and timestamps. Creation defaults to DRAFT and an empty block array to preserve existing optional inputs. Native block properties outside the common UUID/type/group/payload fields are retained, including during read-and-update. PATCH blocks are complete replacement; settings merge preserves omitted current root settings. No concurrency guarantee is implied.
- Forms forward repeated `workspaceIds`; the legacy singular input becomes one element. Forms and submissions enforce limits 1–500 and reject wrong returned page/limit, duplicate identities or inconsistent parents. Workspace paging follows the documented native page/limit response without inventing a 500-item provider limit.
- Questions are read from `{ questions, hasResponses }` and map native `id/title/type` to the existing `key/label/type` fields. Submission listing reads native `submissions` and the selected all/completed/partial count. Exact submission read uses `{ submission, questions }`. Legacy fields are derived from actual answer/question associations; unanswered submissions omit respondentId instead of fabricating one. Multiple responses to one question remain permitted; response IDs must be distinct.
- User identity is `/users/me`, mapping `fullName` to optional name. No timezone query or invented username/human identity is used. Workspace discovery/readback exposes minimal identity and timestamps rather than members/invites.
- Delete actions read the exact requested parent/resource first. Form/workspace deletion is retained trash behavior; submission deletion is permanent. A successful request is not a cleanup or erasure guarantee.
- PDF delivery accepts only the exact native signed `https://api.tally.so/forms/{formId}/submissions/{submissionId}/pdf` route, no userinfo/fragment/alternate host. No API key is supplied to that URL. Native signed capability values remain intentionally deliverable; current schema documents no expiry. There is no renewal helper.

## Authentication and errors

API-key and OAuth auth keys remain supported. New OAuth authorization uses published metadata at `https://api.tally.so/.well-known/oauth-authorization-server`, code flow, S256 PKCE, `user forms responses`, and form-encoded client-secret-post token requests. Current issuer marking is stored with the connection. Unmarked legacy callbacks/refresh keep `https://tally.so/oauth/token` and legacy JSON encoding; this is compatibility preservation, not proof of continued legacy server acceptance or retirement. Missing refresh state requires reconnection. Token normalization retains rotated or omitted refresh tokens and validates expiry/Unicode.

Request and complete native-response checks refuse known raw, percent-encoded, Base64 and Base64url configured-credential reflections before output projection. ServiceError adapters use static operations and numeric upstream status only, with a suppressed raw parent. Shared HTTP capture occurs before local response checks; independently captured internal traces may retain transformed provider reflections despite public refusal. No universal internal privacy claim is made.

## Official sources and limits

Current [OpenAPI](https://developers.tally.so/api-reference/openapi.json), [form PATCH](https://developers.tally.so/api-reference/endpoint/forms/patch), [block guide](https://developers.tally.so/documentation/adding-blocks-to-a-form), [submission read](https://developers.tally.so/api-reference/endpoint/forms/submissions/get), [API keys](https://developers.tally.so/api-reference/api-keys), [versioning](https://developers.tally.so/api-reference/versioning), [changelog](https://developers.tally.so/api-reference/changelog) and public OAuth metadata were read. The captured OpenAPI SHA-256 is `28b98ea5fb21692746d85f8bb8110c74d3826c6e15d33dd0ccf1aa0e92f1db7b`.

No authenticated provider operation was performed. Actual API acceptance, legacy OAuth acceptance, block/editor normalization, trash/history, concurrent behavior, subscription restrictions and deployed signed PDF delivery remain live-unverified. No REST submission-create endpoint is documented; controlled permanent-deletion coverage requires an independently seeded current-run-owned submission and explicit authorization.
