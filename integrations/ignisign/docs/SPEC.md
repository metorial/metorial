Let me get more details on webhook event types and the e-seal feature.Now I have enough information to write the specification.

# Slates Specification for Ignisign

## Overview

Ignisign is an electronic and digital signature platform based in Luxembourg. It provides an API to create, manage, and verify legally binding electronic signatures on documents (PDF, DOCX, images, and raw data), with compliance to eIDAS, ESIGN, and UETA regulations. It supports multiple signature levels (Simple Electronic, Advanced Digital, and Qualified Digital) and processes all signatures in a Hardware Security Module (HSM).

## Authentication

Ignisign uses **API Key (Bearer Token)** authentication. API keys are scoped per application and per environment.

To authenticate:

1. Obtain your **App ID**, **App Environment** (DEVELOPMENT, STAGING, or PRODUCTION), and **App Secret** (API key) from the "API Keys" section of the Ignisign Console.
2. Include the API key in the `Authorization` header as a Bearer token: `Authorization: Bearer <your-api-secret>`.

All API requests are scoped to a specific application and environment. Each application has 3 environments: DEVELOPMENT, STAGING, and PRODUCTION. Signers and Signature Profiles cannot be shared between applications nor environments.

Ignisign also uses **single-use tokens** for specific operations. Unique tokens are single-use authentication tokens generated during the signature process with limited validity. These are used for embedded signature sessions and webhook verification, not for general API access.

## Features

### Signature Requests

Create and manage signature requests that define which documents need to be signed and by whom. Developers can automate document signing workflows and track signature progress in real-time. A signature request goes through a lifecycle: initialization, adding documents and signers, launching, and completion. You can sign PDF documents without needing to add signature placeholders — just provide the PDF as-is. Also supports DOCX, images, and raw/structured data.

### Signature Profiles

Signature Profiles are configurable sets of parameters that define the signature mechanism used when creating signature requests. They control: document types allowed, the legally binding value of the signature, and the signer identification mechanism available. Profiles are created in the Ignisign Console, not via API. Profiles also determine whether the signature session runs in "By-Side" mode (fully managed by Ignisign with email invitations) or "Embedded" mode (integrated into your application).

### Signer Management

Signers are the people who will sign the documents. You can create, update, and revoke signers via the API. To create a signer that matches the requirements of a Signature Profile, you must provide the required inputs (claims), which can be queried via the API. Signer inputs include first name, last name, email, phone number, nationality, birth date, and more. Signers can be defined for a single signature session or for multiple sessions.

### Document Management

Upload and manage documents within signature requests. Supported document types include PDF (including encrypted/protected PDFs), DOCX, images, and structured data. Documents can be signed in full privacy mode where Ignisign processes the signature without accessing document content. You can download original documents, signed documents, and retrieve document content.

### Signature Proofs

After signing, Ignisign generates various proof artifacts: a XAdES signature file representing the technical signature (individual per document), an ASiC-E container with the original document and XAdES file (the file to provide to authorities in case of litigation), a signature proof PDF document, a signature image, and a publicly accessible signature proof web page. You can retrieve these proofs via the API.

### Corporate Electronic Seals

Automate document sealing processes with machine-to-machine (M2M) emitters. Control who can emit seals and manage access to seal emitters. E-Seals prove the origin of corporate documents.

### Signature Session Integration

Two integration modes exist for the actual signing experience:

- **By-Side**: The signature session is fully managed by Ignisign, with emails sent to signers to invite them to sign.
- **Embedded**: The signature session is embedded in your own application using Ignisign's JS, Android, or iOS SDKs. Requires receiving a session token via webhook.

### Webhook Management

Register, update, and manage webhook endpoints via the API or console. Webhooks are organized by topics, and you can choose to receive notifications for all topics or disable specific ones.

## Events

Webhooks allow your application to receive real-time notifications about events occurring in the Ignisign platform, instead of continuously polling the API. Webhooks are configured per application and environment.

### Signer Events

Triggered when signer-related events occur. Actions include:

- **CREATED**: When a signer is created.
- **INPUTS_ADDED**: When new inputs (e.g., name, email, phone) are added to an existing signer.

### Signature Request Events

Triggered when a signature request changes state. Actions include:

- **INITIALIZED**: When a signature request is created.
- **UPDATED**: When a signature request is updated.
- **READY**: When a signature request is ready to be signed.
- **WAITING_DOCUMENTS**: When waiting for documents (document request).
- **LAUNCHED**: When a signature request is launched (critical for embedded mode — provides the session token).
- **CANCELLED**: When a signature request is cancelled (only if no one has signed).
- **EXPIRED**: When a signature request expires (only if no one has signed).
- **COMPLETED**: When a signature request is fully completed.

### Signature Session Events

Triggered during the signing session lifecycle, tracking the status of individual signing sessions.

### Signature Proof Events

Triggered when signature proof documents are generated. Actions include:

- **GENERATED**: When a standard signature proof is generated.
- **ADV_GENERATED**: When an advanced signature proof is generated.

### Signature Image Events

Triggered when signature image representations are generated for signed documents.

### Application Events

Triggered for application-level events within the Ignisign platform.

### Document Request Events

Triggered when events related to document requests occur (e.g., when documents are requested from external parties as part of a signature request).
