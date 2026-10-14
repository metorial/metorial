# Documint API specification

Documint generates PDF documents by merging JSON data with a template. This integration uses the [official public API](https://documenter.getpostman.com/view/11741160/TVK5cLxQ), linked from Documint's [REST API page](https://documint.me/integrations/rest-api).

## Authentication

Requests use the `api_key` header and the base URL `https://api.documint.me/1`. Create an API key in your Documint account's integration settings. Empty API keys are rejected before making a request.

## Tools

| Tool | Endpoint | Behavior |
| --- | --- | --- |
| `list_templates` | `GET /templates` | Return one page of templates with stable IDs, names, and provider metadata. Supports page, limit, name filtering, and sort. |
| `get_template` | `GET /templates/{id}` | Retrieve a single template and its metadata. |
| `update_template` | `PUT /templates/{id}` | Rename a template with a JSON `name` field, then retrieve its current metadata. |
| `delete_template` | `DELETE /templates/{id}` | Permanently delete a template. |
| `create_document` | `POST /templates/{id}/content` | Send variables as the JSON body, with `active=true` and the selected `preview` option. Prepare the generated PDF for download. |

Call `list_templates` to discover template IDs before using the other tools. List results are returned by the API in a `result` array. Pagination starts at 1; the default limit is 100 and the maximum is 200. Sort fields can be comma separated, with a `-` prefix for descending order.

The official merge example returns `url`, `name`, `fileExtension`, `timestamp`, `templateName`, and `templateId`. The existing `documentId` output uses an explicit provider ID when present, or the generated document name. The existing `documentUrl` and `rawResponse` outputs are retained for compatibility.

## PDF retention

Documint [deletes generated documents after 24 hours](https://docs.documint.me/help-and-resources/frequently-asked-questions). The tool retrieves the generated PDF immediately, validates its PDF header, and prepares a downloadable copy. The original `documentUrl` remains temporary. The API key is sent only to the Documint API, never to the PDF storage URL.

The published API collection does not document a current-user endpoint or a generated-document URL renewal endpoint. This integration does not expose account identity or document renewal operations. Template creation and advanced template editing happen in Documint's visual editor; this refresh adds only the documented name update.

## Verification scope

Endpoint, payload, pagination, and response behavior were compared with the public API collection. Builds and source checks do not establish live provider acceptance or deployed file delivery.
