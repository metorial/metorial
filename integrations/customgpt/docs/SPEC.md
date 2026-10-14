# CustomGPT Integration Specification

## Authentication

Connect using an API key, sent as `Authorization: Bearer <API_KEY>` to `https://app.customgpt.ai/api/v1`. Create a key in the CustomGPT profile API tab. The authenticated `/user` response identifies the connection. API failures and invalid action combinations return clear service errors.

## Agents and sources

`list_agents` discovers agent IDs. Existing tools create, retrieve, update, delete, and clone agents. API paths continue to call agents "projects" for compatibility.

`manage_sources` lists the provider's grouped source collections, adds URL/sitemap sources using `sitemap_path`, deletes sources, and requests instant sync. `sourceType` remains an optional legacy hint because CustomGPT detects URL source types. `sourceName` remains available for existing callers, but the provider may derive source names from URLs. OCR boolean inputs map to provider modes 0/1. File uploads and OCR mode 2 are not exposed.

`manage_documents` lists indexed documents with pagination, status filters, and URL/filename search. It also supports deletion, reindexing, metadata reads/updates, and label replacement. Setting an empty label list removes all labels. Discover page IDs with its list action.

## Conversations and messages

`manage_conversation` creates, renames, deletes, or prepares a downloadable conversation export. Export supports `csv` (default), `json`, `excel`, and `pdf`. The optional legacy `exportedContent` output field is retained but no longer contains file data.

`send_message` creates a conversation when needed, sends a prompt without streaming, and passes `lang` as a query parameter. Existing string label lists and the exclusive-filter flag remain supported. `get_messages` lists exchanges and preserves citation IDs inside citation records for follow-up retrieval. `get_message` retrieves one full exchange by prompt ID, with optional customer intelligence when available.

`analyze_message` retrieves claims/trust/verification information or submits a reaction. Feedback accepts `liked`, `disliked`, and `neutral`, with compatibility aliases `thumbs_up` and `thumbs_down`.

## Settings, labels, analytics, and account

`manage_settings` retrieves/updates settings, lists persona versions, and restores a selected version using the documented version path. `manage_labels` lists, creates, renames, or deletes labels. Label creation sends the existing single name as a one-element `names` array. Label and persona features may require a Custom plan.

`get_reports` retains the existing report-type values. Leads returns the provider's structured report data. `get_citation` retrieves citation metadata. `get_account_info` requires a successful current-user read and reports limits as null with a warning if the optional usage read fails.

## API sources

- [API quickstart](https://docs.customgpt.ai/reference/quickstart-guide)
- [Source listing](https://docs.customgpt.ai/reference/get_api-v1-projects-projectid-sources)
- [Source creation](https://docs.customgpt.ai/reference/post_api-v1-projects-projectid-sources)
- [Document listing](https://docs.customgpt.ai/reference/get_api-v1-projects-projectid-pages)
- [Message details](https://docs.customgpt.ai/reference/get_api-v1-projects-projectid-conversations-sessionid-messages-promptid)
- [Sending messages](https://docs.customgpt.ai/reference/post_api-v1-projects-projectid-conversations-sessionid-messages)
- [Citation IDs](https://docs.customgpt.ai/reference/know-which-document-source-gets-most-hits-via-api)
- [Message feedback](https://docs.customgpt.ai/reference/put_api-v1-projects-projectid-conversations-sessionid-messages-promptid-feedback)
- [Conversation exports](https://docs.customgpt.ai/reference/get_api-v1-projects-projectid-conversations-sessionid-export)
- [Label creation](https://docs.customgpt.ai/reference/post_api-v1-projects-projectid-labels)
- [Persona restoration](https://docs.customgpt.ai/reference/put_api-v1-projects-projectid-settings-persona-activate-version)
- [Leads report](https://docs.customgpt.ai/reference/get_api-v1-projects-projectid-reports-leads)
