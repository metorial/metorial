# Fibery integration

Connect using a workspace subdomain and an API token generated in workspace settings. Requests use `Authorization: Token <token>` against `https://<accountName>.fibery.io`.

## Available tools

| Tool | Purpose |
| --- | --- |
| `get_current_user` | Identify the user authenticated by the connected API token. |
| `get_schema` | Discover database names and field definitions. |
| `list_users` | Discover user IDs and names for assignment fields, with pagination. |
| `query_entities` | Select fields, filter, sort, and paginate entity records. |
| `create_entity` | Create a record with primitive and single relation fields. |
| `update_entity` | Update selected fields on the explicitly identified record. |
| `delete_entity` | Permanently delete a record. |
| `manage_collection` | Add, remove, replace (`set`), or clear (`reset`) related items. |
| `manage_document` | Read rich text or write Markdown, HTML, or JSON content. Plain text is a read format. |
| `upload_file` | Upload a file from a public URL and return its ID and metadata. |
| `batch_create_or_update` | Upsert records using a conflict field and return per-record outcomes. Missing entity UUIDs are generated before submission. |

Collection actions accept existing related entity IDs. For `reset`, pass an empty `itemIds` array. Files can be linked using their returned `fileId` and `manage_collection`.

Rich text requires a document secret. `manage_document` accepts that secret directly or looks it up from a database, record ID, and document field. An empty content string can clear a document.

The API token inherits the creating user's permissions. `get_current_user` identifies that user, while `list_users` discovers accessible workspace users for assignment relations. This integration does not expose schema editing, views, comments, GraphQL, file downloads, or automations.

## API references

- [Authentication](https://developers.fibery.com/guides/getting-started/authentication)
- [Command API overview](https://developers.fibery.com/guides/http-api/overview)
- [Response envelope](https://developers.fibery.com/api-reference/response-envelope)
- [Schema](https://developers.fibery.com/guides/http-api/schema)
- [Entity queries](https://developers.fibery.com/guides/http-api/query-entities)
- [Entity creation and updates](https://developers.fibery.com/guides/http-api/create-update-entities)
- [Collections](https://developers.fibery.com/guides/http-api/collections)
- [Rich text](https://developers.fibery.com/guides/http-api/rich-text-and-comments)
- [Upserts](https://developers.fibery.com/guides/http-api/upsert-entities)
- [Files](https://developers.fibery.com/guides/http-api/files)
