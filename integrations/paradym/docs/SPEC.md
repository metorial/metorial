# Paradym Integration

Paradym provides credential issuance, verification, templates, trust configuration, and DIDComm connections. Projects are now called wallets in Paradym. The documented `/v1/projects/**` compatibility routes remain supported and preserve this integration's public project naming.

## Authentication and project discovery

Use a user-scoped API key from Paradym account settings. Requests send the key through `x-access-token`. `list_projects` discovers authorized project IDs without requiring connection configuration. Pass `projectId` to scoped tools; existing connections retain their saved project ID as a fallback.

## Tools

- Credential templates: `list_credential_templates`, `create_credential_template`, `get_credential_template`.
- Credential exchange: `issue_credential`, `get_issuance_session`, `create_verification_request`, `get_verification_session`.
- Verification templates: `list_presentation_templates`, `manage_presentation_template`, `get_presentation_template`.
- Credential lifecycle: `list_issued_credentials`, `revoke_credentials`.
- Trust: `list_trusted_entities`, `manage_trusted_entity`.
- Connections: `list_didcomm_connections`, `manage_didcomm_connection`.
- Discovery: `list_projects`, `list_dids`.

Credential-template list and detail routes are format-specific. When listing without a format, the first page of each format is returned. Specify one format to use `pageAfter`. List results expose provider pagination metadata.

Credential template issuers use a `signer` configuration. Legacy `method`/`network` objects are normalized. AnonCreds `schemaId` is an optional existing schema URI; omit it to create a schema. The legacy object-valued `schema` field remains accepted by the input schema, with a remediation error directing callers to `schemaId`. AnonCreds templates do not support branding or validity fields. mDOC templates require a certificate signer and relative `validity` period.

Direct SD-JWT issuance sends a nested `credential` object. DIDComm invitations use structured goal descriptions and codes. Presentation/trusted-entity updates use PUT; connection display-name updates use POST. Trust DID and certificate strings are converted to provider entry objects and mapped back into the existing public string-array outputs.

Verification results may omit personal attributes according to the project's verification-data access setting. The provider default is webhook-only; API retrieval requires a permitted retention setting. Wallet notification during revocation is limited to supported connected AnonCreds credentials and is confirmed individually by the provider response.

## Official documentation

- [API reference](https://paradym.id/reference), including the supported deprecated project endpoints.
- [Using the API](https://docs.paradym.id/api-and-dashboard/interacting-with-the-api).
- [TypeScript SDK and project compatibility](https://docs.paradym.id/api-and-dashboard/typescript-sdk).
- [Issuing credentials](https://docs.paradym.id/api-and-dashboard/issue-credentials).
- [Presentation templates](https://docs.paradym.id/api-and-dashboard/presentation-templates).
- [Trusted entities](https://docs.paradym.id/api-and-dashboard/trusted-entities).
- [Error codes](https://docs.paradym.id/api-and-dashboard/error-codes).
