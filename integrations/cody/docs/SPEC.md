# Cody Integration Specification

Cody is the business assistant at [meetcody.ai](https://meetcody.ai), using the [Cody AI API](https://developers.meetcody.ai/) at `https://getcody.ai/api/v1`.

## Authentication

Use a secret API key from [the dashboard API Keys page](https://getcody.ai/settings/api) as a Bearer token. Keys do not have an OAuth refresh flow. [Paid Cody Assist plans include API access](https://meetcody.ai/pricing/).

## API capabilities

| Capability | Tools | Provider contract |
| --- | --- | --- |
| Bot discovery | `list_bots` | List and filter configured bots. Bot creation and configuration happen in the dashboard. |
| Folders | `list_folders`, `get_folder`, `create_folder`, `update_folder` | Read, create, and rename folders. No documented delete/archive endpoint. |
| Documents | `list_documents`, `get_document`, `create_document_from_content`, `create_document_from_webpage`, `get_upload_url`, `create_document_from_file`, `delete_document`, `download_document` | Filter by folder, conversation, or name. Text/HTML content is limited to 768 KB. File upload uses a signed PUT URL then an import request; conversion may take up to one hour and returns acceptance without a document ID. Maximum file size is 100 MB. Document HTML is delivered from the provider content URL. |
| Conversations | `list_conversations`, `get_conversation`, `create_conversation`, `update_conversation`, `delete_conversation` | Creation and update require name and bot ID. Focus mode accepts up to 1,000 document IDs accessible to that bot. Optional `includeDocumentIds` returns the focus IDs on reads. |
| Messages | `list_messages`, `get_message`, `send_message`, `send_message_stream` | Messages are limited to 2,000 characters. Optional sources and token/credit usage are available on reads. Streaming returns an SSE URL with `redirect: false`; streams end with `[END]`. |

The official reference includes pagination metadata but omits a `page` query parameter in its OpenAPI schema. Existing page inputs are preserved for compatibility; live verification of later pages remains necessary.

The signed-upload reference shows direct `url`/`key` fields, while its official JavaScript example uses a `data` envelope. Both documented response shapes are accepted.

The public API does not document an account/self endpoint, bot mutations, folder deletion, document updates, or events. No speculative tools or event handlers are exposed.

## Live verification

The live suite performs safe discovery, owns conversations and documents, and verifies readback, deletion, response sources/usage, SSE content, and actual HTML download bytes. A dedicated folder must be provisioned in the dashboard for document and folder rename scenarios. An optional focusBotId must identify a bot configured to access that folder for focused conversation creation, document filtering, focus updates, and clearing verification. Folder creation and asynchronous file import scenarios are gated because the public API cannot guarantee their cleanup. Webpage ingestion requires a configured public test webpage and account support.
