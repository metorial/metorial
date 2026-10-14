# PrintAutopilot

Submit PDF documents to remote print queues, retrieve queued documents as downloadable PDFs, register printers and paper sizes, and record successful or failed printing results.

Connect with the **connection token** from your PrintAutopilot dashboard. The `submit_document` tool additionally needs the target queue's **API token**. These tokens serve different purposes.

| Tool | Purpose |
| --- | --- |
| `submit_document` | Send one valid base64-encoded PDF to a queue. |
| `list_print_jobs` | Retrieve queued document groups, printer and paper-size metadata, document IDs, and downloadable PDFs. |
| `create_printers` | Register printers and their driver-reported paper sizes. |
| `finish_documents` | Record `success` or `failed` for document IDs returned by `list_print_jobs`. |

Record successful results only after printing completes. The documented job-list endpoint serves the connected print app's queue; it is not documented as a full history or status-search endpoint.

If a queued document has invalid PDF content, `list_print_jobs` retains its ID and metadata with a `pdfError` and continues retrieving valid PDFs. Use that ID to record the failed printing result.

API reference: [PrintAutopilot's Postman documentation](https://documenter.getpostman.com/view/1334461/TW6wJonb).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
