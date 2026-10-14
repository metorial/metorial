# Ignisign Integration

Use the IgniSign API to create and manage electronic signature requests, signer identities, documents, and corporate electronic seals.

## Authentication

Current API keys begin with `skv2_` and identify an application and environment. The integration derives that scope from the key and validates it against the application context. API calls use Bearer authentication. Legacy stored connections may fall back to their saved application ID and environment.

## Workflows

- Create a draft request, initialize document placeholders, upload file or JSON content, assign signers, and publish the request.
- Use `create_signature_request_in_one_call` to create and publish a request with signer email addresses and document files or public document URLs.
- Use `get_signature_requests_status` to check several requests together; `get_signature_request` returns full context.
- Use `download_document` to download an original file and `get_signature_proof` to download a signed proof. Signature image downloads are optional.
- Use `seal_document` with a document payload or one stored document ID and the document hash signed with the emitter private key. Returned proof files are downloadable.

File upload sends multipart form data. JSON document content is supplied inside the `jsonContent` field. Document titles map to the provider's `label` field.

## Sources

- [API authentication](https://www.ignisign.io/docs/ignisign-api/ignisigns-api)
- [One-call signing](https://www.ignisign.io/docs/ignisign-api/create-signature-request-in-one-call)
- [Official Node SDK](https://github.com/ignisign/ignisign-node)
- [Official public models](https://github.com/ignisign/ignisign-public-models)
