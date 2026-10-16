# Cloudlayer Integration

## API and authentication

The API root is `https://api.cloudlayer.io/v2`. Every API request uses the connection's API key in `X-API-Key`. The existing auth output remains `{ token: string }`; configuration is empty. There is no OAuth refresh flow.

Official references: [API overview](https://cloudlayer.io/docs/api-overview/), [account](https://cloudlayer.io/docs/account/), [jobs](https://cloudlayer.io/docs/jobs/), [assets](https://cloudlayer.io/docs/assets/), and [storage](https://cloudlayer.io/docs/storage/).

## Generation

The six generation workflows use `POST /html/pdf`, `/url/pdf`, `/template/pdf`, `/html/image`, `/url/image`, and `/template/image`. HTML and custom templates are base64 strings. `templateData` is sent as the provider's `data` object. The public PDF `batch: string[]` input is translated to the documented `{ batch: { urls: string[] } }` request body. A batch takes precedence over `url` when both are supplied. Legacy `waitForSelector.timeout` maps to documented `options.timeout`; explicit `options.timeout` wins. Legacy preview `imageType` maps to documented `type`; explicit `type` wins. All legacy fields remain accepted.

The six tools accept an optional `async` boolean. The provider defaults it to true and returns a job ID and actual state. Setting false waits for completion but v2 still returns JSON. No completion state, ID, date, or bytes are synthesized when missing. A response missing its required job ID or state raises an actionable error.

PDF generation supports paper dimensions, margins, page ranges, backgrounds, CSS page size, headers/footers, and previews. Image generation supports PNG, JPG, WebP, JPEG, and SVG; optional quality applies to JPG/JPEG/WebP. Viewports can emulate mobile, touch, and landscape behavior.

Endpoint references: [HTML to PDF](https://cloudlayer.io/docs/html-to-pdf/), [URL to PDF](https://cloudlayer.io/docs/url-to-pdf/), [template to PDF](https://cloudlayer.io/docs/template-to-pdf/), [HTML to image](https://cloudlayer.io/docs/html-to-image/), [URL to image](https://cloudlayer.io/docs/url-to-image/), [template to image](https://cloudlayer.io/docs/template-to-image/).

## Jobs, files, and account

- `get_job` and `list_jobs` retain actual job IDs and states. Documented `processTime` and `apiCreditCost` populate the existing processing-time and credits fields. Epoch-millisecond creation times become ISO strings in existing timestamp fields.
- `get_asset` returns existing file metadata and prepares the file for download. `list_assets` discovers file IDs and URLs. Existing URL fields remain compatible.
- `retrieve_job_asset` reads the actual job, searches stored assets by their provider `jobId`, and downloads the matching file after success. Its output contains metadata, state, search count, and an optional continuation cursor; it contains no file bytes or download URL. Searches are bounded to three pages by default, ten maximum, with repeated-cursor detection.
- `get_account` identifies the account by `uid` and reports subscription, billing model, usage, storage, and credit fields when supplied.
- `get_account_status` retains its legacy `/getStatus` request. Its existing fields are preserved; the absence of that route from current docs does not establish that it is invalid.

Job/asset endpoint pages document `limit` and `startAfterId`, whereas the overview says the lists have no pagination queries. Inputs follow the endpoint pages while preserving legacy `offset`. Responses are not assumed to be exhaustive, and cursor support requires provider verification.

Optional scalar nulls are omitted from typed summary fields. Additive provider details retain actual nulls and objects; API keys and request credentials are removed from those details.

## Download lifetime

The provider documents asset URLs as pre-authenticated, so downloads do not need the API key. Their expiry depends on storage configuration; no universal provider TTL is claimed. A runtime policy rereads metadata through the authenticated asset endpoint after at most 15 minutes. Recognized S3 Signature V4 URLs use the documented `X-Amz-Date` plus `X-Amz-Expires` deadline to cap that recheck with a 10-second safety margin. Links at or inside that margin are rejected both initially and after metadata retrieval, even when the returned URL changes. Unknown URL timing retains the runtime recheck policy. Metadata retrieval does not promise a new signature or URL. Job-linked URL renewal checks the job and, if necessary, a bounded asset search. Missing or retained-away files fail explicitly. The policy does not extend provider retention or guarantee a URL lasts fifteen minutes.

## Scope

There are 13 public workflows. Cloudlayer is one document-generation product, so separate product categories are unnecessary. Existing per-request webhook URL inputs remain supported. No trigger registration, storage-administration workflows, live API testing, or tool-use evaluations are part of this change.
