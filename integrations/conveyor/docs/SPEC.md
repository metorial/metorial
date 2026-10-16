# Conveyor integration

The integration exposes 31 public tools using API key authentication. No connection configuration is required. Select the necessary module read/write permissions when creating the API key in [Conveyor Settings](https://docs.conveyor.com/reference/api-token). Requests use the documented v2 API with `X-API-KEY`; invalid or inactive keys may produce an empty HTTP 403 response. The documented rate limit is 2,000 requests per five minutes.

| Capability | Tools |
| --- | --- |
| Trust Center analytics | `list_connections`, `list_interactions`, `list_product_lines` |
| Curated knowledge | `list_knowledge_base_questions`, `search_knowledge_base`, `list_question_tags`, `create_knowledge_base_question`, `update_knowledge_base_question` |
| Access requests | `list_authorization_requests`, `get_authorization_request`, `ignore_authorization_request` |
| Authorizations | `list_authorizations`, `grant_authorization`, `update_authorization` |
| Access groups | `list_access_groups` |
| Folders | `list_folders`, `create_folder`, `delete_folder` |
| Documents | `list_documents`, `create_document`, `update_document`, `delete_document` |
| Questionnaires | `list_questionnaires`, `submit_questionnaire`, `update_questionnaire`, `list_questionnaire_questions` |
| Intake | `create_questionnaire_request`, `update_questionnaire_request` |
| One-off answers | `ask_question`, `list_one_off_questions` |
| RFP projects | `list_projects` |

Use `list_product_lines`, `list_access_groups` and `list_folders` to discover IDs for document and questionnaire operations. Use `list_knowledge_base_questions` and `list_question_tags` before editing curated content. Knowledge search includes curated answers and past questionnaire answers, with answers truncated to 500 characters. New discovery and mutation tools return the provider's response under `result`, preserving its identifiers, sparse metadata and null values.

Direct document and questionnaire uploads accept `fileContentBase64`, `fileName`, and optional `contentType`. Document uploads enforce the documented 100 MB limit. Questionnaire submissions also accept `contentVersionId` with `fileName` and `contentType` for Salesforce files. Intake tools support uploading questionnaire content; portal links and context belong in `rawData`. The existing upload transport is retained.

`ask_question` supports product scope, multiple choice questions, confidence thresholds and analytics email. Multiple choice questions require options. `update_questionnaire` can approve or complete a questionnaire, change its due date or assignee, and clear notes with an empty string or null. Completion triggers provider grading. Paginated tools require positive whole-number page values while retaining their existing numeric schema types and provider defaults.

Existing tool keys, response fields and schema types remain supported. The questionnaire-request update documentation lists a required path `id` while displaying a URL without a placeholder; the existing `/questionnaire_requests` route is retained pending provider clarification. Empty replacement arrays on query-based assignment endpoints need provider transport confirmation: the new Q&A update reports this limitation instead of silently omitting the update. Existing authorization transport remains supported. Some legacy response mappings may depend on fields whose complete schema was not available in the public reference; no response-requiredness changes were inferred.

The public API index has no current-user/profile endpoint suitable for an identity tool. Webhook support requires manual setup in Conveyor and exposes payload details after setup; this integration does not register triggers. Export/download endpoints, audit events, Trust Center designer administration and full project creation remain outside this refresh.

Sources: [API index](https://docs.conveyor.com/llms.txt), [knowledge search](https://docs.conveyor.com/reference/get-knowledge-base-search), [create curated Q&A](https://docs.conveyor.com/reference/post-knowledge-base-question), [update curated Q&A](https://docs.conveyor.com/reference/patch-question), [question tags](https://docs.conveyor.com/reference/get-question-tags), [questionnaire questions](https://docs.conveyor.com/reference/get-questions), [update questionnaire](https://docs.conveyor.com/reference/patch-questionnaire), [one-off questions](https://docs.conveyor.com/reference/get-one-off-questions), [question answering](https://docs.conveyor.com/reference/post-single-question), [projects](https://docs.conveyor.com/reference/get-projects), [documents](https://docs.conveyor.com/reference/post-document), [questionnaire submission](https://docs.conveyor.com/reference/post-questionnaires), [webhooks](https://docs.conveyor.com/docs/webhooks).
