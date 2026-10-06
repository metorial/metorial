# Files.com

Read and manage authorized files, folders, users, groups, permissions, share links, notifications and automations. Follow native file-migration status and query provider audit history. Upload and download small files of at most 10 MiB.

Connect an API key and optional site subdomain. The resolved HTTPS service origin is stored with the connection. Keys retain their owning-user, workspace, permission-set and folder restrictions; a site-wide key does not imply an identified human user. Existing connections may use their historical stored subdomain until reconnecting.

Sixteen tools preserve all twelve original keys. Copy and move may return pending migrations; request acceptance does not prove completion. Downloads deliver a file without exposing contents or authorization fields in structured output. Small uploads follow the native part/finalize protocol; partial uploads or uncertain final receipts require exact-resource inspection before retrying. Transfers can create audit history and uploads can replace existing files.

Folder name search is an ad-hoc operation and may be delayed or truncated. Paths retain spelling and significant whitespace; use `/` separators and explicit resource identities. Root is valid for reads and folder rules, never for file removal. Provider-specific Unicode/accent equivalence is not replaced with guessed local matching.

Administration capabilities require native permissions. Account changes, recursive deletion, share links, notifications and automation runs can have lasting effects; authorize them explicitly. No triggers or replacement webhook registration are provided.

API references: [official REST documentation](https://www.developers.files.com/rest/) and [official JavaScript SDK](https://github.com/Files-com/files-sdk-javascript).

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

Exact file receipts are compared with the provider's versioned path map, preserving the original spelling in requests and outputs and retaining significant trailing whitespace. The bundled `src/lib/path-comparison.json` is the official Files.com map version 1 (`utf8mb4_0900_ai_ci`, MySQL 8.4.5), retrieved 2026-10-06 from [the official SDK data](https://github.com/Files-com/files-sdk-javascript/blob/master/shared/path_comparison.json). It applies scalar replacements once; generic lowercasing or Unicode normalization is not substituted. See [provider comparison rules](https://www.files.com/docs/files-and-folders/file-system-semantics/unicode-normalization) and `LICENSE-FILES-COM.txt`. Remote mounts can retain distinct names; use their exact provider spelling.
