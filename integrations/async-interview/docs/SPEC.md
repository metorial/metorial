# Async Interview

This integration provides read-only access to interview jobs and candidate responses.

## Tools

- `list_jobs`: returns the job records provided by the API, including their identifiers.
- `list_interview_responses`: returns candidate details, job and interview-stage identifiers, submission timestamps, text answers, recording links, and attempts. An optional `jobId` filters the retrieved records locally; discover IDs with `list_jobs`.

## Connection

The existing API client uses `https://app.asyncinterview.ai/api` and a Bearer API token. It calls `GET /jobs` and `GET /interview_responses`. These routes and authentication behavior are retained for compatibility; the public provider pages reviewed do not document their request or response contracts.

An API token is required. Request failures and unexpected list payloads are reported as structured service errors.

## Scope and documentation

The provider's [pricing page](https://www.asyncinterview.ai/pricing/) advertises API access, interview downloads, and AI transcriptions. Its [help center](https://asyncinterview.io/help-center/) describes product workflows. Product capabilities do not establish an API endpoint contract.

This integration does not expose invitations, job mutations, downloads, transcription retrieval, or triggers. No current-user API endpoint was verified from the public official resources, so no identity tool is registered. Recording URLs are metadata returned by the response-listing tool.
