# Truvera integration

## Implemented capabilities

The integration supports decentralized identifiers, credential issuance and verification,
credential schemas, revocation registries, organization profiles, proof templates,
proof requests, current-user profile discovery, and asynchronous job status checks.

Use `get_current_user` to identify the authenticated account; `list_dids`,
`list_schemas`, `list_registries`, and `list_proof_templates` discover resource IDs.
Use `list_proof_requests` and `get_proof_request` to follow credential verification,
and `get_schema` to inspect a schema before issuing a credential.

## Authentication and environments

Truvera API keys are sent as `Authorization: Bearer <API_KEY>`. Select the
same environment as the API key: production uses `https://api.truvera.io`;
test uses `https://api-testnet.truvera.io`. Test data does not transfer to production.

## API contracts

- List endpoints accept a nonnegative integer `offset` and a positive integer
  `limit`. The maximum is 64, except credential listing, which supports 100.
  Credential listing also accepts `filter` and exact holder `subjectId` searches.
- DID list metadata supplies `credentialCount` as a string; the integration
  converts it to its existing numeric output. Nullable credential issuer names
  and keys are omitted from their existing optional string outputs.
- Registry list rows contain `id` and a nested `registry` object. Existing flat
  and `policy_and_type` metadata shapes remain supported.
- DID, schema, registry, and revocation mutations may return a queued job. The
  response `id` identifies the job; `data.id` identifies the created resource.
  Call `get_job` to confirm completion. A queued request is not proof of completion.
- Schema IDs can be URLs. They are encoded as one path segment for
  `GET /schemas/{schemaId}`. A schema definition may be null if unavailable.
- Profile creation requires a DID and name. Profile updates include the DID
  in both the path and body. Existing optional branding fields are preserved.
- A proof request can use an existing template or standalone PEX descriptors.
  The provider also accepts a name-only request; existing optional inputs stay optional.
  Template requests use `POST /proof-requests` with `name` and `template`,
  preserving the caller's requested name. The template's purpose is inherited.
  Template expiration amount and unit must be supplied together.
- Persisting a credential requires a 4-to-32-character encryption password.
  Existing algorithms and formats remain available; `secp256r1` is additionally
  available for ES256 SD-JWT issuance.

## Official sources

Contracts were checked against the official [OpenAPI document](https://swagger-api.truvera.io/openapi.yaml)
and the following documentation:

- [Getting started](https://docs.truvera.io/truvera-api/getting-started)
- [DIDs](https://docs.truvera.io/truvera-api/dids)
- [Credentials](https://docs.truvera.io/truvera-api/credentials)
- [Credential schemas](https://docs.truvera.io/truvera-api/credential-schemas)
- [Registries](https://docs.truvera.io/truvera-api/registries)
- [Profiles](https://docs.truvera.io/truvera-api/profiles)
- [Proof templates](https://docs.truvera.io/truvera-api/presentations/proof-templates)
- [Proof requests](https://docs.truvera.io/truvera-api/presentations/proof-requests)
- [Data and current-user profile](https://docs.truvera.io/truvera-api/data)
- [Jobs](https://docs.truvera.io/truvera-api/jobs)
- [Direct verification](https://docs.truvera.io/truvera-api/verify)

## Verification limits

These are documentation-backed contracts. No authenticated provider calls were
made during this refresh. Account permissions, plan availability, blockchain
completion, credential distribution, and cryptographic acceptance require live
verification. Existing `bjj` key and deprecated `CredentialStatusList2017` registry
choices remain available for compatibility; their availability was not inferred
from omission in the narrative documentation.
