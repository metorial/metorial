# Writer integration specification

Writer provides model generation, Knowledge Graph retrieval, file management,
and deployed no-code agent invocation through `https://api.writer.com/v1`.

## Authentication

Create an API key in AI Studio Admin Settings > API Keys. Requests use
`Authorization: Bearer <API_KEY>`. The API agent owning the key must permit the
requested capabilities. No workspace or team ID is required at connection setup.

## Model generation

`list_models` discovers available Palmyra and configured external model IDs.
`chat_completion` and `text_completion` accept either the existing `model`
selection or `modelId` from discovery. Existing model choices are retained;
Palmyra X6 is available as an additional choice. Responses are non-streaming.

Chat supports custom functions, one built-in Knowledge Graph or web-search tool,
and JSON Schema responses on compatible models. Assistant function calls can be
sent back in conversation history together with matching tool result messages.
Chat results preserve function-call arguments and available retrieval metadata.

## Knowledge Graphs

Create, list, retrieve, update, delete, add/remove files, and ask grounded
questions. `list_knowledge_graphs` exposes cursor pagination and optional team
filtering; omitting team IDs returns org-wide graphs. Resource IDs are discovered
through list tools and supplied to subsequent operations. Retrieval exposes file
processing counts. Questions preserve source snippets, subqueries, and available
reference metadata. Updating a description to an empty string clears it.

## Files

Upload UTF-8 text or base64-encoded bytes with a filename and MIME type. An upload
can associate the file with a Knowledge Graph; retrieve the file afterward to
confirm that association. Wait for processing to complete before attaching a
file to another graph. Lists support cursor pagination and filters for graph,
processing status, and extension. Legacy offset inputs remain available by
walking cursor pages; file ordering follows creation time.

`download_original_file` provides a downloadable original file and metadata.
`download_file` retains its existing text output and is deprecated in favor of
the original-file download. Delete operations confirm the provider response.

## No-code agents

List deployed agents with cursor pagination, retrieve their input definitions,
and invoke a text-generation or research agent synchronously. The invocation
endpoint does not support chat agents. File inputs use an uploaded file ID.

## Scope

Standalone PDF parsing, asynchronous agent jobs, graph web connectors, and other
built-in chat tool types are not exposed. There is no suitable current identity
endpoint in the v1 API reference. No triggers are registered.

## Official references

- [API keys](https://dev.writer.com/api-reference/api-keys)
- [Chat completion](https://dev.writer.com/api-reference/completion-api/chat-completion)
- [Text generation](https://dev.writer.com/api-reference/completion-api/text-generation)
- [Models](https://dev.writer.com/api-reference/completion-api/list-models)
- [Knowledge Graphs](https://dev.writer.com/api-reference/kg-api/list-graphs)
- [Knowledge Graph questions](https://dev.writer.com/api-reference/kg-api/question)
- [File upload](https://dev.writer.com/api-reference/file-api/upload-files)
- [File listing](https://dev.writer.com/api-reference/file-api/get-all-files)
- [Original file download](https://dev.writer.com/api-reference/file-api/download-file)
- [No-code agents](https://dev.writer.com/api-reference/application-api/applications)
- [OpenAPI schema](https://dev.writer.com/api-reference/gateway-api-schema.yaml)
