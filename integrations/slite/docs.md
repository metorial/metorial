# Slite workflows

1. Read `get_current_user` to check the connected user and organization. Read `list_notes` or `search_notes` to discover document IDs. Preserve the returned native cursor or zero-based page; follow continuation metadata instead of assuming a result is complete.
2. Use `get_note` for content and optional child discovery. `childrenCursor` continues only child results. HTML supports `css`; SliteML supports `compact`. `download_note` delivers one current representation as a file.
3. Create or update a note using one of Markdown, HTML, or SliteML. Omitted fields remain unchanged. Empty content is an explicit request. Collection attributes follow native positional column semantics; the provider can ignore incompatible values. Nullable slots do not promise clearing. Requests are limited to 1 MiB by the provider.
4. Use `manage_note_lifecycle` to verify, flag outdated, archive, unarchive, or assign exactly one user/group owner. `verifyUntil` requires an ISO date and time with a timezone. Unsupported fields for another action are refused locally.
5. Use `find_user_or_group` for ID lookup or cursor-based search. Search filters do not apply to ID lookup, and archived-user filters do not apply to groups. These tools do not administer people or memberships.
6. `ask_question` preserves a pending thread ID and native state. Read the same thread with `get_ask_thread`. Source IDs in thread rounds are citation IDs; do not treat them as document IDs. Failed and needs-approval states remain explicit.
7. `manage_custom_content` preserves existing index/list/delete actions on documented deprecated endpoints. Supply an existing UI-provisioned root. An acknowledged deletion confirms the native receipt, not removal of retained conversation/history references.
8. `audit_knowledge_base` lists all, public, inactive, or empty notes. `reviewStateList` and `sinceDaysAgo` apply only to all/public categories. These audits reflect accessible provider data, not an unrestricted organization inventory.

A malformed or mismatched write receipt means the write may already have occurred. Inspect the exact resource before retrying. There are no automatic write retries. Delete success requires the native 204 receipt and a subsequent unavailable-resource read; failures during confirmation leave the result unresolved.
