# Resistant AI

Resistant Documents analyzes original PDF and image files for evidence of fraud.
This integration provides document submission, fraud-result retrieval, and
permanent submission deletion. Existing tools for StackGo IdentityCheck remain
available with their original keys and input/output contracts.

## Authentication

Choose **Resistant Documents Client Credentials** for the document tools. Provide
the client ID and client secret provisioned for your tenant and select its
deployment cell: `eu-1`, `us-1`, `ca-1`, `ap-2`, `ap-3`, or `testing`. Testing is
available in EU only. The integration requests `submissions.read` and
`submissions.write`, records the access-token expiration from `expires_in`, and
obtains a new client-credentials token when refresh is requested. API and token
hosts are selected together from the official deployment table.

Choose **IdentityCheck API Key (Legacy)** for the original verification,
screening, and KYB tools. Its existing `api_key` method still accepts `apiKey`,
and existing saved connections remain supported. These tools use StackGo's
IdentityCheck API, which is a separate product from Resistant Documents.
Credentials for one product are rejected by the other product's tools before
any request is made.

## Document workflow

1. Call `submit_document` with the original file encoded as base64. The
   integration creates a `FRAUD_ONLY` submission and uploads decoded, unchanged
   binary bytes to the provider's presigned URL using HTTP PUT and
   `application/octet-stream`. It returns `submissionId` after the upload is
   accepted. Optional `queryId` must be opaque, contain no personal information,
   and be at most 1024 characters.
2. Call `get_document_fraud_result` with the submission ID. Optional
   `withMetadata` enables indicator metadata. The complete provider JSON is
   returned as `result`; terminal processing failures are retained as results.
   HTTP 404 returns `ready: false`, because results may be unavailable while
   processing. Confirm the ID, retry with exponential backoff and jitter, cap
   intervals at 45 seconds, and stop after 15 minutes.
3. Call `delete_document_submission` to permanently remove the submission. The
   tool reports deletion only after the provider returns HTTP 204.

Document submission does not enable Adaptive Decision, submission
characteristics, or payload encryption. This workflow does not retrieve PDF
reports or quality/classification results. Provider limits vary by tenant;
there is no universal documented maximum file size. Default quotas are four
submission requests per second (burst six) and ten other requests per second
(burst fifteen). On throttling, back off before retrying; submission creation
and upload are not retried automatically to avoid duplicate submissions.

## Legacy compatibility

The eleven original IdentityCheck tools keep their original routes, public
keys, schemas, enums, field meanings, and optionality. Report and certificate
URLs remain intact. Existing endpoints could not be verified against public
StackGo API documentation during this refresh; their presence is retained for
compatibility and is not evidence of support by Resistant AI.

## Official documentation

- [Authentication and regional token URLs](https://developers.resistant.ai/getting-started/getting-access-token)
- [Create, upload, and retrieve results](https://developers.resistant.ai/getting-started/quickstart-api)
- [Create a submission](https://developers.resistant.ai/api-reference/create-a-submission-%5Beu-1%5D)
- [Fetch fraud results](https://developers.resistant.ai/api-reference/fetch-fraud-result-%5Bus-1%5D)
- [Delete a submission](https://developers.resistant.ai/api-reference/delete-submission-%5Beu-1%5D)
- [Polling](https://developers.resistant.ai/receiving-results/polling)
- [Limits and quotas](https://developers.resistant.ai/support/limit-and-quotas)
