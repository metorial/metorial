# Outline

Create, read, update, search and organize Markdown documents and collections. Manage collection access, comments and groups, inspect the authenticated user and workspace, and download individual Markdown exports.

Set the exact HTTPS instance URL in API Token authentication. Cloud defaults to `https://app.getoutline.com`; self-hosted connections must use their own instance. Existing connections retain a validated stored instance configuration until reconnected. Requests do not follow redirects.

Document creation retains `publish:true` by default; set `publish:false` for drafts. Use `lastRevision` from a fresh document read to reject concurrent edits. `append` and editing-session `done` remain supported; `emoji` maps to the native icon field. Current document creation does not create templates: `template:true` is refused before a write, while `templateId` creates a document from an existing template. Older servers may lack current native fields or receipts; upgrade the server or use its supported interface when an operation is refused.

List/search tools return one page, native pagination when supplied, and a `total` that counts returned records on that page. Group and collection management include exact readbacks. Accepted mutation receipts do not establish absence of other access grants or erase notifications, event history, exports or copies. Permanent document deletion is irreversible.

Markdown export downloads one document, excluding descendants and bundled media. Embedded links keep their provider permissions and expiry. Export content is bounded to 8 MiB. There are no webhook or polling tools.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

Request and complete native response content are checked for reflected authentication values, including supported encoded forms, before transport or successful output respectively. A refused response may follow a write that already took effect; inspect the exact resource before retrying.
