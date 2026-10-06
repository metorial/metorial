# Hex API integration

The 24-tool surface uses the authenticated deployment's documented `/api/v1` API. Twenty established keys remain; identity, group/collection details and project-file export are added. No trigger is registered.

## Authentication

`api_token` retains its required `token`. Optional deployment origin is stored after successful `/users/me` verification; old token-only auth and stored config origins remain compatible. Auth origin wins over legacy config. Only HTTPS Hex origins without credentials, paths, query/fragment or non-default ports are accepted; requests do not follow redirects with credentials. Personal identity/expiry fields are provider-supplied and omitted for workspace tokens when unavailable. No token/prefix or unsupported automatic refresh is exposed.

## API contracts

Project DTOs map native id, status/category names, lastEditedAt and lastPublishedAt to established fields. Required email-only person shapes do not gain fabricated IDs/names. Sharing sends nested user/group/collection IDs and access, unwraps `{project, errors}`, prevalidates all input categories, and reports sequential partial failures.

Documented 201 creation and 204 deletion/cancellation codes are required. Group creation reads back the real creation timestamp; failed readback identifies the accepted ID and warns against duplicate creation. Run lists parse `{runs, nextPage, previousPage}` and select API-triggered history. Deactivation requires 200 and the matching returned user ID; its acknowledgement is not independent activation-state proof.

Membership uses `members.users[].id` and add/remove entries. Absent collection/user/data metadata stays optional; null user names remain null. Connection details/credentials and free-form notification diagnostics are excluded. Pagination exposes real cursors and returned counts only. Unsupported legacy sort fields fail with guidance.

Published execution preserves variable-name inputs, explicit recipients and deprecated cache semantics. Submission/cancellation is not completion. Embedding converts decimal seconds exactly to whole milliseconds, maps legacy export scopes/base padding, and validates signed links against the selected deployment. Header semantics are not invented.

Export POST `/projects/export` produces a downloadable YAML file with a sanitized basename and metadata. Draft is default; latest means latest published. No unsupported project/collection/history deletion, publication, cells/guides/semantic-model management or data-connection writes are added.

## Verification and effects

Timeouts, disabled credential-forwarding redirects, sanitized service failures and no automatic mutation retries protect uncertain operations. Schema contracts preserve historical keys/input types/enums/requiredness, allowing only documented output relaxations. Private live checks use exact independent workspace identity, complete bounded paging, unique markers, preregistered cleanup and approved synthetic effects fixtures. Project/collection cleanup requires a real authorized administrative service plus native permanent-absence proof. User deactivation is safety-gated without an actual disposable-user setup/reactivation/readback lifecycle. Missing local profiles alone do not skip the suite.

Sources: [overview/auth/limits](https://learn.hex.tech/docs/api-integrations/api/overview), [reference](https://learn.hex.tech/docs/api-integrations/api/reference), [OpenAPI](https://static.hex.site/openapi.json).
