# DocuSeal API coverage

Authentication uses `X-Auth-Token` and the configured US/EU cloud API origin. No identity is inferred from the key or resource authorship.

| Tools | Native routes |
| --- | --- |
| list/get/create/update/clone/merge/archive template | `GET /templates`, `GET/PUT/DELETE /templates/{id}`, `POST /templates/pdf`, `/templates/docx`, `/templates/html`, `/templates/{id}/clone`, `/templates/merge` |
| create submission / create submission from PDF | `POST /submissions`, `POST /submissions/pdf` |
| list/get/archive/update submission | `GET /submissions`, `GET/DELETE/PUT /submissions/{id}` |
| download submission documents / merged get-submission PDFs | `GET /submissions/{id}/documents` with native `merge` option |
| list/get/update submitter | `GET /submitters`, `GET/PUT /submitters/{id}` |

The [API reference](https://www.docuseal.com/docs/api) documents cloud authentication and routes. The official [template controller](https://github.com/docusealco/docuseal/blob/master/app/controllers/api/templates_controller.rb) additionally confirms external-ID updates and positional role updates; these legacy options remain supported. [Submission](https://github.com/docusealco/docuseal/blob/master/app/controllers/api/submissions_controller.rb) and [submitter](https://github.com/docusealco/docuseal/blob/master/app/controllers/api/submitters_controller.rb) controllers clarify soft archival and irreversible completed signing. The [document controller](https://github.com/docusealco/docuseal/blob/master/app/controllers/api/submission_documents_controller.rb) uses account-configured file expiry; metadata does not publish that timestamp.

Responses use native wrappers, nullable signer details and exact native IDs. Lists preserve `pagination.count`, `next` and `prev`; absence or malformed responses fail visibly. Writes retain deliberate notification/signing defaults, and exact readbacks guard minimal receipts and partial updates. A failed readback cannot roll back the original operation. Archival is soft and history remains.

Download URLs are accepted only from supported cloud document hosts and paths, without credentials or redirects. Available PDFs are read within a combined 64 MiB bound and provided as downloadable files. This limit is local transport behavior, not a claim about provider upload or plan limits. Preview generation can retain files. No webhooks, triggers, permanent deletion, identity discovery or self-hosted configuration are offered.
