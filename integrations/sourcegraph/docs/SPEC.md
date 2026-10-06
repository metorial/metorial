# Sourcegraph API coverage

The 14 retained keys cover search, file/directory reads, repository list/exact reads, batch-change list/exact reads/close, insight list/create/delete, monitor list/create/delete and current-user identity. Authentication uses native access-token or sudo headers, with a saved instance binding for new connections and an explicit legacy config fallback.

Search uses the V3 event stream; query text and native filters are preserved. GraphQL operations use variables and documented presentation/input/connection shapes, validate receipts, report error locations and reject partial success. GraphQL remains a provider-documented unstable debug surface; deployment schema, permissions and Enterprise feature availability are prerequisites.

Cursor paging, bounded nested reads, nullable insight totals and native false/empty values are handled explicitly. File reads expose text as requested and binary metadata without fabricating downloads or URL renewal. Writes may retain historical/notification/code-host effects, and an uncertain response does not imply rollback. No admin, AI, indexing, repository ownership, versioned API migration or replacement trigger capability is claimed.
