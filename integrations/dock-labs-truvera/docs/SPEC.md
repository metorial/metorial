# Truvera Integration

## Connection

Use an API key from [Truvera Workspace](https://truvera.io/keys) and the environment in which it was created. Requests use bearer authentication against `https://api.truvera.io` for production or `https://api-testnet.truvera.io` for testnet. The provider also documents the older `DOCK-API-TOKEN` authentication scheme, but bearer authentication is the current recommendation. No OAuth refresh is needed for an API key.

## Tools

The integration manages DIDs, organization profiles, credentials, schemas, revocation registries, proof requests, and blockchain jobs. It also verifies credentials or presentations, sends encrypted DIDComm messages, retrieves received messages, reads the connected user profile, and discovers credential design templates.

Credential schemas are supplied inside the issuance request's `credential` object. A registry ID or status object can link a credential to revocation; `revocable` can provision a registry automatically. `algorithm: "dockbbs"` enables credentials that support zero-knowledge proofs. Issuers must belong to the connected account. Distribution requires a recipient email or subject DID, and persistence requires a password.

Organization profiles are addressed by their issuer DID. Use the DID returned by the profile list as `profileId` for get, update, and delete. A profile update includes that DID in the request body.

DID creation supports the documented cheqd, key, and legacy Dock methods. Existing Polygon ID and older signing-key input values remain available for compatibility; the current API does not advertise Polygon ID creation. Blockchain operations can return a job ID and separate resource data. Poll `get_job_status` for completion.

A proof request has a name, nonce, optional verifier DID, and a request containing PEX input descriptors. The tool places the purpose inside that request. Its QR URL can be presented to a wallet holder. Read the request again to inspect verification status and the submitted presentation.

Sending a message first encrypts a plaintext payload using the sender and recipient DIDs, then dispatches the returned JWE. An already encrypted JWE can be dispatched directly. Sender DIDs for wallet messaging must have a DIDComm service; the provider excludes did:key senders. `get_messages` lists metadata and retrieves individual message content.

DID export returns an encrypted wallet JSON download while preserving the existing structured export result. Credential listing returns metadata; retrieving persisted credential contents with a password is provider-deprecated in favor of cloud wallets and remains available for compatibility.

## Compatibility and verification limits

Existing tool keys, input types, and legacy enum values are preserved. Numeric pagination fields remain JSON Schema numbers, with whole-number range checks before supported list requests. Page limits are 64, except credential listing, which allows 100.

The current OpenAPI document does not list `/anchors` or `/presentations`. Existing anchor and presentation-creation handlers are preserved because omission alone does not prove removal. Their current availability has not been verified. This refresh uses official documentation and local build validation; no authenticated provider calls were made.

## Official references

- [Getting started and authentication](https://docs.truvera.io/truvera-api/getting-started)
- [Current OpenAPI contract](https://swagger-api.truvera.io/openapi.yaml)
- [DIDs](https://docs.truvera.io/truvera-api/dids)
- [Credentials](https://docs.truvera.io/truvera-api/credentials)
- [Organization profiles](https://docs.truvera.io/truvera-api/profiles)
- [Proof requests](https://docs.truvera.io/truvera-api/presentations/proof-requests)
- [Holder messaging](https://docs.truvera.io/truvera-api/messaging)
- [Credential templates](https://docs.truvera.io/truvera-api/templates)
