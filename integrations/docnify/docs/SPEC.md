# Docnify

Docnify is a document-signing platform. This integration exposes five tools:
create a document from a template, add a recipient, send a document for signing,
retrieve one document, and list documents.

## Connection

Provide an API token and the HTTP or HTTPS URL of your Docnify instance. The
instance URL may include a deployment path prefix, but must not contain embedded
credentials, query parameters, or a fragment. The integration retains its
existing `/api/v1` request prefix and raw token Authorization header.

## Compatibility

All existing tool keys and input/output field types are retained. Document IDs
are encoded as one URL path segment. Existing pagination inputs remain numeric
and are forwarded to the provider. Network and upstream failures are returned
as structured service errors; requests have a 30-second timeout.

## Documentation and verification limits

The official API reference linked by existing ecosystem components is
<https://app.docnify.io/api/v1/openapi>. It could not be retrieved during the
October 13, 2026 refresh: browser retrieval failed and a direct request failed
with a TLS server-name error. <https://docnify.com> was also unavailable through
browser retrieval. These failures do not establish that an endpoint or the
product has been removed.

API routes, request fields, response shapes, pagination behavior, and available
additional endpoints remain unconfirmed against a current official API
reference. No new endpoints were inferred from third-party implementations.
No authenticated provider calls or document-signing operations were performed.
The integration registers no lifecycle triggers.
