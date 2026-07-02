Now I have enough information to write the specification.

# Slates Specification for Dock Certs

## Overview

Dock Certs is a complete solution for creating, managing and presenting Verifiable Credentials. It is a Verifiable Credentials company that provides Dock Certs, a platform and developer solutions that enable organizations to issue, manage and verify fraud-proof credentials efficiently and securely. The platform is built on W3C open standards and uses blockchain and cryptography to make credentials tamper-proof and instantly verifiable.

## Authentication

Dock Certs uses API keys to authenticate requests. You can obtain an API Key by signing into Dock Certs. Create your first API key by clicking 'Create API key' in the Developer section of the Dock Certs dashboard.

Once a key has been generated, it should be included in all request headers using the `DOCK-API-TOKEN` header:

```
DOCK-API-TOKEN: your_api_key
```

When you generate an API key, you may include a list of whitelisted IPs that can use with that key.

**Endpoints:**

For production mode, use the endpoint: `https://api.dock.io`. For test mode, use the endpoint: `https://api-testnet.dock.io`.

Dock Certs provides two endpoints based on which mode was selected when creating your API key. By default, the API keys are created for production. You can switch to test mode in Dock Certs by clicking the test mode toggle in the top right next to your avatar icon.

In test mode your used transaction count will not increase or hit monthly limits allowing for sandboxing on our test network.

**Sub-accounts:**

Sub-accounts allow enterprise customers to segregate their data within the platform based on their own customers. Each sub-account can have its own keys, organization profiles, credential designs and verification templates. When using a sub-account the root account can set up separate API keys for each sub-account. By using the sub-account specific API key it will ensure all the transactions are attributed to that sub-account.

## Features

### Decentralized Identifiers (DIDs)

DIDs are Decentralized Identifiers meant to be globally unique identifiers that allow their owner to prove cryptographic control over them. A DID identifies any subject (e.g., a person, organization, thing, data model, abstract entity, etc.). DIDs in Dock are created by choosing a 32-byte unique identifier along with a public key. You can update and delete a DID as well as list all DIDs. The API supports both native Dock DIDs and Polygon ID DIDs.

### Verifiable Credentials

Verifiable Credentials are cryptographically secure and tamper-proof. Once issued, they cannot be edited. The API allows creating, issuing, listing, retrieving, and deleting credentials. Key options when issuing include:

- **Anchor**: Publish a hash on the Dock blockchain as proof of issuance with a timestamp.
- **Persist**: Store the credential encrypted on Dock's servers, accessible via URL/QR code.
- **Distribute**: Send credentials directly to recipients' emails and Dock Wallet.
- **Schema**: Reference a credential schema to enforce structure.
- **Template**: Apply a visual certificate design template.
- **Expiration**: Set an expiration date for the credential.
- **Status/Revocation**: Attach a revocation registry for future revocation capability.

The API supports issuing two types of credentials: native Dock Verifiable Credentials and Polygon ID Verifiable Credentials. To issue Polygon ID credentials, the issuer must be a `did:polygonid` issuer.

### Credential Verification

You can verify issued/received credentials and presentations. Verification will check that the JSON-LD document's cryptographic proof is correct and that it has not been revoked. It will return a verification status with a boolean verified result.

### Proof Requests

It often makes sense for a verifier to request proof of credentials from a holder. A proof requests system is built into the API that works with the Dock Wallet. When a request is created, you will receive a URL which you should display in a QR code for a wallet application to scan. You can define which attributes should exist in the credential, a name for the holder and yourself to see and a nonce/challenge which prevents replay attacks. The system supports the DIF Presentation Exchange (PEX) syntax for querying and filtering credentials. When verifying Zero Knowledge Proof credentials, you can use range proof verification conditions that will verify the credential without disclosing the actual value of an attribute.

### Presentations

You can create and sign a verifiable presentation out of one or more Verifiable Credentials. Presentations bundle credentials together for sharing with a verifier.

### Credential Schemas

Schemas define the structure and required fields for a Verifiable Credential. You can create custom schemas using JSON Schema format, list all schemas, and retrieve specific schemas. Schemas can be registered on the blockchain.

### Revocation Registries

It is recommended that the revocation authority create a new registry for each credential type. Dock Certs allows you to create, delete, and revoke/unrevoke the credential. You can retrieve a specified registry as well as a list of all registries created by the user. If you want to revoke BBS+ credentials, you must create a registry with type `DockVBAccumulator2022`. For revoking other credentials, you can use `StatusList2021Entry` or `CredentialStatusList2017`.

### Anchoring

In the context of verifiable credentials, anchors are used to attest that the credential document was not altered and was created at a specific time. Batching multiple documents/credentials into a single anchor is done through a Merkle tree and can save on cost/time as only the Merkle root has to be anchored. You can create, list, retrieve, and verify anchors.

### Certificate Design Templates

Dock Certs has a Certificate Designer feature allowing users to customize the design of their credentials. You can start designing a custom certificate from scratch or use existing templates like Training Certificates, Bills of Lading, and Commercial Invoice. Templates can be managed via the API and referenced when issuing credentials.

### Sub-Accounts

Sub-accounts allow enterprise customers to segregate their data within the platform based on their own customers. Each sub-account can have its own keys, organization profiles, credential designs and verification templates.

### Messaging

The API supports sending encrypted messages between DIDs, enabling direct credential delivery to wallet holders.

## Events

Dock Certs provides webhooks for asynchronous integration with the API. You can add or modify webhook endpoints that will send events when issuing or when transactions occur. Under Developer, select Webhook and click Add Endpoint. A token is sent in the webhook POST request for you to validate that the webhook came from the platform.

### Credential Events

- **credential_create**: This event indicates a credential has been created. It will fire when a credential has been created.
- **credential_issued**: This event indicates a credential has been issued.
- **credential_revoke**: This event indicates a credential has been revoked.
- **credential_unrevoke**: This event indicates a credential has been unrevoked.

### DID Events

- **did_create**: This event indicates a DID has been created.
- **did_update_key**: This event indicates a keyType value within the DID has been updated.
- **did_update_controller**: This event indicates a controller value within the DID has been updated.
- **did_delete**: This event indicates a DID has been deleted.

### Registry Events

- **registry_create**: Fires when a revocation registry has been created.
- **registry_delete**: Fires when a revocation registry has been deleted.

### Schema Events

- **schema_create**: This event indicates a schema has been created. It will fire when a schema has been created.

### Proof Events

- **proof_submitted**: This event indicates that a proof has been submitted. Minimal data is included in the event but the details can be retrieved using the proof_request API.

You can subscribe to all events by clicking Receive All next to Endpoint Events.
