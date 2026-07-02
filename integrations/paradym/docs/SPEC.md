Let me get the Pipedream source code to find the full list of webhook event types.Based on my research, I now have enough information to write the specification.

# Slates Specification for Paradym

## Overview

Paradym is a digital identity platform built by Animo Solutions that provides APIs for issuing, verifying, and managing verifiable credentials. It supports SD-JWT credentials over OpenID4VC and AnonCreds credentials over DIDComm, with compliance to European Digital Identity (EUDI) standards. Paradym is an API-first platform hosted at `https://api.paradym.id`.

## Authentication

Authorization to the Paradym API is done using an API key, which needs to be provided in the `x-access-token` header field. An API key can be created via the Quickstart guide in the Paradym Dashboard. An API key is scoped to a user, and thus has full access to all projects that the user who created the API key has access to.

Example request:

```
curl 'https://api.paradym.id/v1/projects' \
  --header 'x-access-token: paradym_xxxxxxxx' \
  --header 'Content-Type: application/json'
```

Most API endpoints are scoped under a project, and for these endpoints a `projectId` needs to be provided in the URL. The `projectId` can be found in the Settings tab on the Paradym dashboard, or on the project overview page.

## Features

### Credential Template Management

Create and manage credential templates that define the schema, attributes, branding, and issuer settings for verifiable credentials. Supported formats include SD-JWT VC (over OpenID4VC), ISO 18013-5 mDOC/mDL (over OpenID4VC), and AnonCreds (over DIDComm). Templates can be configured with attributes (typed as string, number, boolean, date), validity periods, visual branding (background color, images, text color), and revocability settings. Templates can be registered on the cheqd network (using `did:cheqd`) or on a web service hosted by Paradym (using `did:web`).

### Credential Issuance

Issue, verify, and revoke SD-JWT credentials over OpenID4VC as well as issue and verify AnonCreds credentials over DIDComm. Issuance creates an offer containing a URI/QR code that can be scanned by a compatible wallet. Direct issuance is also available for SD-JWT VCs, where no exchange protocol is used and the credential is directly signed and returned in the API. Credentials can be issued with dynamically populated attributes using attribute providers.

### Credential Verification

Create presentation templates to define what credentials and attributes to request from a holder. Each presentation template can request one or multiple credentials (up to 20). Supported formats for presentation templates include SD-JWT VC, mDOC, and AnonCreds. Verification requests generate a URL/QR code for the holder to scan and present their credentials. Attributes can be constrained by value, range, or type.

### Credential Revocation

Revocation of SD-JWT credentials is supported, ensuring credentials can be invalidated after issuance. AnonCreds credentials can be batch-revoked, with optional wallet notification via DIDComm Revocation Notification.

### Trusted Entities

Trusted Entities API and dashboard allow managing trusted issuers for presentation templates. Paradym supports X.509 certificates and DIDs as trusted entities. Trusted entities are linked to presentation templates to restrict which issuers are accepted during verification.

### Attribute Providers

Attribute providers are external HTTPS endpoints that Paradym can call during OpenID4VC issuance to fetch attribute values for a credential, allowing you to keep your source of truth in existing systems and populate credentials dynamically. Attribute providers also integrate with authorization servers; if a credential template is linked to an authorization server, the access token and ID token are forwarded to your attribute provider.

### DIDComm Connections

Create and manage DIDComm connections between parties. Connections are established through invitations (single-use or reusable) and can be used for credential issuance, verification, and secure messaging between entities.

### Project and Member Management

Users on the Pro or Custom tier can create new projects and edit the members of a project. Only the owner of the project is able to add collaborators to the project. Projects provide multi-tenancy, with each project having its own templates, sessions, and settings.

## Events

Paradym supports webhooks for receiving real-time notifications about credential exchange events. Webhooks are configured under the Settings tab within a project. Webhook event wildcards are supported, reducing complexity for developers managing large-scale projects.

### OpenID4VC Verification Events

Notifications when a credential verification session over OpenID4VC changes state, such as when a holder successfully presents verified credentials. Event type: `openid4vc.verification.verified`.

### DIDComm Verification Events

Notifications when a credential verification session over DIDComm changes state, such as when a holder successfully presents verified credentials. Event type: `didcomm.verification.verified`.

### Issuance Session Events

Webhooks can be used to get notified of changes in credential issuance sessions for both OpenID4VC and DIDComm protocols. This covers session state transitions such as when a credential offer is accepted and the credential is issued.
