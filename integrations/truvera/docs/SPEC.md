Now let me get the full list of webhook events:# Slates Specification for Truvera

## Overview

Truvera (formerly Dock Certs) is a decentralized identity platform by Dock Labs that enables organizations to issue, verify, manage, and revoke W3C-compliant verifiable credentials. It provides DID (Decentralized Identifier) management, credential schemas, revocation registries, ecosystem governance tools, and supports standards like OpenID4VCI/VP, DIDComm, and zero-knowledge proofs.

## Authentication

Truvera uses API keys to authenticate requests. You can obtain an API key by signing into Truvera Workspace.

Once a key has been generated, it should be included in all request headers as a Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

When you generate an API key, you may include a list of whitelisted IPs that can use with that key.

Truvera provides two endpoints based on which mode was selected when creating your API key. By default trial users only have access to Test data. Paid subscribers can create production API keys by switching the test mode toggle in Truvera Workspace.

- **Production endpoint:** `https://api.truvera.io`
- **Test endpoint:** `https://api-testnet.truvera.io`

Any transaction you perform in test mode cannot be used for production. This means that, for example, any DID created in test mode will not work for issuing or verification in production.

## Features

### Decentralized Identifier (DID) Management

Create and manage decentralized identifiers (DIDs) on the cheqd blockchain using the did:cheqd method or a non-registry based DID using the did:key method. DIDs serve as the identity anchors for issuers, verifiers, and holders within the credential ecosystem. You can create, update (key type and controller), and delete DIDs.

### Credential Issuance

Credential issuance is the process of creating and signing a verifiable credential using the Truvera API. Verifiable Credentials are cryptographically secure and tamper-proof. They cannot be edited once issued, but they can be revoked and replaced with a new credential.

- You can issue to multiple subjects per credential by passing an array of objects.
- Truvera's API has built-in credential distribution on issuance, allowing you to send credentials directly to a holder's email and/or Truvera-compatible wallet.
- Credentials can optionally be persisted (encrypted with a password) on Truvera's platform.
- Multiple signature algorithms are supported (e.g., Ed25519, BBS+ for zero-knowledge proofs).
- You can create a request to gather certain claims from the holder and then issue them a credential after submission. The claims are user provided and type is based on the schema provided. This can be useful to catch a subject's DID without knowing it beforehand.

### Credential Verification & Presentations

To verify a credential, verifiers need to create a proof template and generate a proof request to which the holder wallet will provide the verifiable presentation. The system supports the DIF Presentation Exchange (PEX) syntax for querying and filtering credentials.

- Verification templates define which schemas, attributes, and conditions are required.
- When verifying Zero Knowledge Proof credentials, you can use range proof verification conditions that will verify the credential without disclosing the actual value of an attribute.
- You can combine verifying multiple credentials in one verification template.

### Revocation Registries

Manage on-chain revocation registries to revoke and unrevoke credentials. To support revocation, the credential must be linked to a revocation registry at the time of issuance. To link the revocation registry, set the status field in the credential body to the registry ID. Supports the StatusList2021Entry standard.

### Credential Schemas

Create and assign schemas to credentials for compliance. Schemas define the structure and required fields of credentials, and can be shared among issuers. Schemas are stored on-chain and referenced by their blob ID.

### OpenID Integration

Truvera provides implementation of OpenID for Verifiable Credential Issuance (OID4VCI) and OpenID for Verifiable Presentation (OID4VP). It outlines the steps required to set up an issuer, create credential offers, manage the issuance flow, create presentations and verify the issued credentials.

- Create OID4VCI issuers with claim mappings and authentication provider settings.
- Supports authorization code flow for credential issuance.
- Supports `ldp_vc` and `jwt` credential formats.

### Ecosystem Tools (Trust Registry)

Create a network of trusted issuers and verifiers using Ecosystem Tools. Ecosystem tools allow you to:

- Create and manage trust registries with governance frameworks.
- Invite and manage participants as issuers, verifiers, or both.
- Lock credentials to the ecosystem so only approved verifiers can check them.
- Motivate issuers by enabling credential monetization.

### Credential Monetization (KVAC)

Issue paid credentials where verifiers pay for verification. This uses the KVAC (Keyed-Verification Anonymous Credentials) algorithm, enabling privacy-preserving monetization where issuers earn from credential verifications.

### Sub-accounts

Sub-accounts are a feature that allows Truvera's enterprise customers to segregate their data within the platform based on their own customers. Each sub-account can have its own keys, organization profiles, credential designs and verification templates.

- The parent account sets up separate API keys for each sub-account and uses the sub-account specific API key for transactions associated with that sub-account.
- Sub-accounts are limited to 5 for trial users.

### Holder Messaging via DIDComm

Send messages to credential holders using the DIDComm messaging protocol, enabling secure, DID-based communication between parties.

### Organization Profiles

Manage organization profiles associated with DIDs, including branding and display information used when issuing and verifying credentials.

### Team Management

Manage team members with role-based access to your Truvera account.

## Events

Truvera supports webhooks that can be configured through the Truvera Workspace. Webhook endpoints receive POST requests with a secret token for validation and an event payload.

### Credential Events

- **credential_create** — Fires when a credential has been created.
- **credential_issued** — Fires when a credential has been issued (signed and delivered).
- **credential_revoke** — Fires when a credential has been revoked via a revocation registry.
- **credential_unrevoke** — Fires when a credential has been unrevoked.

### DID Events

- **did_create** — Fires when a DID has been created.
- **did_update_key** — Fires when the key type of a DID has been updated.
- **did_update_controller** — Fires when the controller of a DID has been updated. Also fires when both controller and key type are updated simultaneously.
- **did_delete** — Fires when a DID has been deleted.

### Registry Events

- **registry_create** — Fires when a revocation registry has been created.
- **registry_delete** — Fires when a revocation registry has been deleted.

### Schema Events

- **schema_create** — Fires when a credential schema has been created.

### Proof Events

- **proof_submitted** — Fires when a proof (verifiable presentation) has been submitted by a holder. Includes the proof request ID and verification status. Full details can be retrieved via the proof request API.
