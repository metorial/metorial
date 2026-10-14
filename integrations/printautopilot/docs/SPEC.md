# PrintAutopilot Integration

PrintAutopilot connects applications to physical printers through remote PDF queues and a desktop print client. The base URL is `https://printautopilot.com/api`.

## Authentication

The connection uses a bearer **connection token** from the dashboard. The provider documents this token for print-app endpoints: `/printers`, `/print-jobs`, and `/finish-print-jobs`.

Document submission uses a separate **queue API token**, supplied as `printQueueToken` to `submit_document`. The queue token replaces the connection token in the Authorization header for that request.

## Tools

| Key | Provider request | Contract |
| --- | --- | --- |
| `submit_document` | `POST /document/create` | One JSON object containing `fileName` and `base64`. The tool validates base64 and a PDF header before submission. The documented accepted response is HTTP 202 with `status: "ok"`. |
| `list_print_jobs` | `GET /print-jobs` | Returns an array of groups with `Printer`, `PaperSize`, `scaling`, and `documents`. Document IDs and filenames remain in output; valid PDF contents are available as downloadable files. Invalid documents retain their metadata with `pdfError` so failed printing can be acknowledged. |
| `create_printers` | `POST /printers` | A JSON array of printer names and `paperSizes`; each paper size contains `name`, `height`, `width`, and `rawKind`. Dimensions keep the printer driver's original units, which the API reference does not define. |
| `finish_documents` | `POST /finish-print-jobs` | A JSON array of document `id`, `state` (`success` or `failed`), and optional `err_msg`. Record results after actual printing. |

The existing tool keys and input field types remain available. The document submission API does not support batching PDFs. The published reference does not document pagination, queue discovery, identity, or full print-history retrieval. The `check-version` route is explicitly restricted to the provider's own client and is not exposed.

## Sources and verification limits

- [Provider website](https://printautopilot.com/) links to the API reference and describes connection tokens, queue API tokens, and Windows/macOS clients.
- [Provider-linked Postman API reference](https://documenter.getpostman.com/view/1334461/TW6wJonb).
- [Public collection backing the reference](https://documenter.gw.postman.com/api/collections/1334461/TW6wJonb?segregateAuth=true&versionTag=latest).

The public collection was published in 2021 and remains linked from the current website. Documentation review and local build verification do not establish live API or physical-printing behavior.
