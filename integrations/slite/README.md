# Slite

Work with documents and knowledge in Slite through its public v1 API.

Connect using a personal API key, or an Enterprise service-account key where available. The official setup guides specify the `x-slite-api-key` header. A read-only key cannot perform document changes. Permissions and organization features can restrict individual operations.

The integration offers 15 tools: create, read, update, delete, list, and search notes; manage verification, archive state, and ownership; update existing tiles; find users and groups; audit content; ask questions and read existing Ask threads; read the current profile; download one note; and manage existing custom indexed content.

Use `get_current_user` to check the native email, display name, and organization name/domain. The profile endpoint supplies no user or organization ID. Use `find_user_or_group` to discover IDs for ownership changes.

`download_note` provides the current Markdown, HTML, or native SliteML representation of one exact note. SliteML preserves rich blocks. There is no recursive child export or historical-version selector.

An Ask question can create a retained conversation and consume quota. A processing result includes a recoverable thread ID; poll `get_ask_thread` after its suggested delay. Reading a thread does not approve changes. A timeout can leave an existing conversation, so do not blindly submit the question again.

Custom indexing uses provider-deprecated endpoints that remain documented. It requires an existing custom root provisioned in the Slite application and an enabled organization feature. No replacement or retirement date is documented. The integration does not create roots or administer users/groups.

Deleting a note permanently deletes its children. Archive state is reversible; deletion is not. Provider audit history, notifications, webhooks, and automation effects can remain after cleanup.

Official sources: [API reference](https://developers.slite.com/reference/listnotes), [authentication](https://developers.slite.com/docs/getting-started), [current OpenAPI](https://api.slite.com/openapi.json), [API help](https://slite.com/help/OBsom1-PF7S6Tb/Slite-API).
