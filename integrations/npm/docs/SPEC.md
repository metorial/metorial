# npm API specification

## Implemented capabilities

Nine tools cover package metadata (including all versions and the exact provider document), search with scoring and pagination, point/range/bulk/per-version download counts, package security advisories, distribution tags, deprecation/undeprecation of an exact version, granular access tokens, trusted-publisher configuration, and the current user profile. Package publishing and unpublishing are not exposed.

## Requests and authentication

Registry requests use `https://registry.npmjs.org`; download statistics use `https://api.npmjs.org`. Public reads do not require authentication. Private package reads and account/package writes require a suitable npm token. Account operations have endpoint-specific token restrictions. Token creation completes after OTP verification; accounts without 2FA may omit OTP initially to trigger npm’s email challenge, then retry with the received code. Trusted-publisher operations require OTP verification; bypass-2FA granular tokens cannot perform token/governance writes.

Token creation maps `cidrWhitelist` to `cidr`, `permission` to `packages_and_scopes_permission`, and `orgPermission` to `orgs_permission`. Its name is validated for create; OTP remains optional so npm can initiate the documented email challenge; the existing expiration string supports `7d` notation by converting it to a numeric day count, while ISO strings pass through. Lists retain pagination metadata and map provider `expiry` to `expires`.

Trusted publisher creation sends `{ type, claims, permissions }` entries. Existing string claims remain supported. GitHub `repository_owner` plus `repository` become `owner/repository`, and `workflow_filename` becomes `workflow_ref.file`. Optional `nativeClaims` supports exact structured provider claims without changing the string-map input contract. `rawConfigurations` retains complete response claims and permissions; normalized `claims` retains string values.

Deprecation fetches the write document and sends the full document with the selected version changed, preserving other versions and metadata. OTP is supported for dist-tag writes and deprecation.

## Response fidelity

All existing tool keys, input types, enum values, and input requiredness remain. Outputs retain their existing fields and types. Package maintainer names are optional because npm documents human objects with a name, email, or URL rather than requiring a name. Nullable optional metadata is omitted in normalized string fields and retained in `rawMetadata`. Download counts are validated numbers: missing collections/counts do not become successful empty/zero results. Null bulk entries are omitted from the normalized map and retained in `rawDownloads`. The user profile remains a passthrough response, including its original `tfa` variants.

No tools download or generate files; tarball URLs in metadata are package metadata rather than file content.

## Official sources

- [Registry API and search](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md)
- [Package metadata](https://github.com/npm/registry/blob/main/docs/responses/package-metadata.md)
- [Download count API and limits](https://github.com/npm/registry/blob/main/docs/download-counts.md)
- [Current-user profile](https://github.com/npm/registry/blob/main/docs/user/profile.md)
- [Token, trust, and security advisory APIs](https://api-docs.npmjs.com/)
- [npm CLI deprecation implementation](https://github.com/npm/cli/blob/latest/lib/commands/deprecate.js)

Hooks were retired by npm; this integration registers no triggers.
