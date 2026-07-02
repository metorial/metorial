# Slates Specification for Digicert

## Overview

DigiCert is a certificate authority (CA) providing digital certificate services including TLS/SSL certificates, code signing, document signing, and IoT device trust. Organizations can automate enterprise-scale machine identity management, certificate lifecycle operations, secure code signing, private PKI infrastructure, and device trust workflows through its APIs. DigiCert offers two main platforms: CertCentral for public certificate ordering, issuance, renewal, and revocation, and DigiCert ONE for trust lifecycle management, private PKI, and IoT.

## Authentication

DigiCert supports different authentication methods depending on the platform being used:

### CertCentral APIs (Services API, Report Library API, Automation API, Discovery API)

- **API Key (Header-based):** DigiCert CertCentral APIs use API keys for both authentication and authorization. Each request to the service must include an API key, done using the custom HTTP header `X‑DC‑DEVKEY`.
  - API keys are generated in the CertCentral console under **Automation > API Keys**.
  - When linking a key to a user, you link the user's permissions to the key. By default, the key is authorized to perform any actions the user can.
  - You can restrict the API key's permissions: **Orders** (orders, requests, certificates only), **Orders, Domains, Organizations** (adds organizations and domains), or **View Only** (GET requests only; POST, PUT, or DELETE requests are disabled).
  - A service user has API-only access to your CertCentral account. DigiCert recommends using service users for API integrations.
  - After you generate a key, it is displayed only once. There is no way to retrieve a lost API key. If you lose a key, you should revoke it and generate a new one.
  - Base URL (US): `https://www.digicert.com/services/v2/`
  - Most accounts use the US instance of CertCentral. If your account uses the Europe instance, your CertCentral console displays CertCentral Europe in the top left corner. The Europe instance uses a different base URL.

### DigiCert ONE APIs (Trust Lifecycle Manager, IoT Trust Manager, Software Trust Manager, Document Trust Manager)

- **API Key (Header-based):** The DigiCert ONE APIs support header-based API key authentication. To authenticate with an API key, include the custom HTTP header `x‑api‑key` in your request.
  - API keys are managed in the DigiCert ONE Account Manager console.
  - Base URL: `https://one.digicert.com/`

- **Client Authentication Certificate (mTLS):** A client authentication certificate is a digital certificate that verifies that you are a user in DigiCert ONE when you request to perform an action via the API. It allows applications to securely communicate with the API.
  - For mTLS, prefix the hostname with `clientauth` (e.g., `https://clientauth.one.digicert.com`).
  - Do not include the `x-api-key` header when using mTLS.

- **Enrollment Passcode (IoT only):** Some IoT Trust Manager operations support authentication with an enrollment passcode using the custom HTTP header `x-passcode`. The value is the passcode associated with the enrollment profile.

## Features

### Certificate Ordering and Lifecycle Management

Order, issue, renew, and revoke public TLS/SSL certificates programmatically. Supports various certificate types including OV, EV, wildcard, multi-domain, and client (S/MIME) certificates. Certificates can be reissued and duplicate certificates can be generated. Orders can be approved, rejected, or have notes attached.

- Certificate types include TLS/SSL, code signing, document signing, and client certificates.
- Orders go through validation workflows (domain control validation and organization validation) before issuance.

### Domain Management and Validation

Add, manage, and validate domains for your account. DigiCert supports several domain control validation (DCV) methods that you can use to validate your domains. Pre-validating domains speeds up certificate issuance.

- DCV methods include email, DNS CNAME, DNS TXT, HTTP file-based, and others.
- Domain validation status and expiration can be tracked.

### Organization Management and Validation

Manage organizations associated with your account and submit them for validation. The validation type corresponds with a certificate type. For example, OV validation allows you to order OV TLS certificates for the organization.

- Supports OV, EV, code signing, and EV code signing organization validation types.
- Organization contacts and verified contacts can be managed via the API.

### Account and User Administration

Manage accounts, divisions, users, and organization settings. Create and manage service users for API-only access. Configure account-level settings such as notification preferences and approval workflows.

### Certificate Automation

The Automation API allows you to automate certificate enrollment and installation on your devices. It gives you complete control to configure automation profiles and manage automation activities.

- Depending on the host, you can set up agent-based or sensor-based (agentless) automation.

### Certificate Discovery

Scan your network using sensors to find your internal and public-facing SSL/TLS certificates, regardless of the issuing Certificate Authority.

### Reporting

Create and manage custom reports for CertCentral certificate orders, domains, organizations, and more. A Custom Reports API allows generating customizable data sets by leveraging GraphQL.

- Reports can be scheduled and run on demand.
- Only CertCentral admins can use the Report Library API. The API key must belong to a user with the Administrator access role.

### Private PKI (Trust Lifecycle Manager)

Manage private CA hierarchies, certificate profiles, and X.509 certificate issuance. Automate PKI operations including certificate discovery and lifecycle management for internal certificates.

### Code Signing (Software Trust Manager)

Manage code signing keypairs and automate signing workflows. Supports secure key storage and signing operations for software artifacts.

### Document Signing (Document Trust Manager)

Integrate digital document signing for electronic seals, signatures, and timestamps.

### IoT Device Trust (Device Trust Manager)

IoT device provisioning, certificate enrollment, firmware updates, and lifecycle management. Manage device groups, certificate management policies, and device identities.

- Perform administrative and device management tasks such as creating divisions, certificate management policies, device groups, and devices.

## Events

CertCentral webhooks send automatic updates for certificate issuance and validation events. Use webhooks to trigger automated workflows without polling the API for certificate and validation status.

- Webhooks are not enabled for all CertCentral accounts. To request access, contact your account manager or DigiCert Support.
- You can only create one webhook in your CertCentral account.
- CertCentral supports adding a custom secret key to webhooks. Use the secret key to verify the source of webhook events. The secret key is sent in the `X-WEBHOOK-KEY` header.

### Certificate Issued

CertCentral sends `certificate_issued` events when DigiCert issues a certificate in your account. By default, it only sends events for certificates not issued instantly. You can enable notifications for certificates issued instantly as well.

- Optionally include the full certificate chain in the event payload.

### Certificate Revoked

Triggered when a certificate is revoked in your account (`certificate_revoked`).

### Order Rejected

Triggered when a certificate order is rejected (`order_rejected`).

### Organization Validated

Triggered when organization validation is completed (`organization_validated`).

### Organization Validation Expiry

Two event types notify when validation (OV, EV, code signing, or EV code signing) for an organization is about to expire. Both `organization_expired` and `organization_revalidation_notice` events are triggered relative to the expiration date of the given validation type.

- Notification timing is configurable: 90, 60, 30, or 7 days before, the day of, or 7 days after expiration.

### Domain Validated

Triggered when domain control validation is completed for a domain (`domain_validated`).

### Domain Validation Expiry

Two event types notify when domain control validation (DCV) for a domain is about to expire. Both `domain_expired` and `domain_revalidation_notice` events are triggered relative to the expiration date of the domain's validation.

- Notification timing is configurable with the same options as organization validation expiry events.
