# Crowdin Integration

Uses Crowdin API v2 with bearer authorization. Standard requests use `https://api.crowdin.com/api/v2`; Enterprise requests use `https://{organizationDomain}.api.crowdin.com/api/v2`.

OAuth uses the confidential authorization-code flow with S256 PKCE, state validation, refresh-token rotation fallback, and the provider's token lifetime. Enterprise OAuth tokens identify `organization_domain`; personal-token authentication owns the optional organization subdomain. Tools retain a legacy saved config fallback for older connections.

The public tools cover project lifecycle, files/directories/branches, source strings, translation status, translation builds/downloads, translation upload and string translations, pre-translation with status polling, translation-memory lifecycle and exports, glossary terms/lifecycle and exports, tasks, members, authenticated identity, and supported-language discovery. Collection operations expose provider pagination. Provider response envelopes are retained in `raw`.

Source files, translation builds, and completed TM/glossary exports provide downloadable files using actual signed URLs and `expireIn` timestamps from Crowdin. Renewal reissues a URL using stable project/resource/job identifiers. The URLs require no additional bearer header. Deleted resources or unavailable export jobs cannot be renewed.

Source-string `text` remains a string for scalar values. It is omitted for documented null/plural values; plural objects are preserved in `pluralText` and `raw`. Nullable project creation timestamps and Enterprise TM source language IDs remain absent from their optional scalar fields and are preserved in `raw`. Nullable glossary names remain absent from the optional scalar `name` field and are preserved as null in `raw`.

References:

- [Crowdin API v2](https://support.crowdin.com/developer/api/v2/)
- [Crowdin Enterprise API v2](https://support.crowdin.com/developer/enterprise/api/v2/)
- [String-based projects](https://support.crowdin.com/developer/api/v2/string-based/)
- [OAuth authorization](https://support.crowdin.com/developer/authorizing-oauth-apps/)
- [Scopes](https://support.crowdin.com/developer/understanding-scopes/)
