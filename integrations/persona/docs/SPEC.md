Now let me get the full list of events:Now I have enough information to write the specification.

# Slates Specification for Persona

## Overview

Persona is an identity verification and compliance platform that enables businesses to verify individuals and businesses through government IDs, selfies, database lookups, document verification, and risk reports. It supports KYC/AML compliance, fraud prevention, and automated identity workflows across global markets.

## Authentication

Authentication is performed via HTTP Bearer Authentication. Provide your API key as the bearer token value.

All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.

**How to obtain an API key:**

Each environment has its own API key; select the API key for the specific environment you would like to use. API keys have distinct prefixes: production keys start with `persona_production` and sandbox keys start with `persona_sandbox`.

API keys are created and managed in the Persona Dashboard under **API > API Keys**.

**Request format:**

```
Authorization: Bearer <API_KEY>
```

**Permissions:**

Each API key can be configured with granular permissions to limit read or write access to specific resources (e.g., `account.read`, `inquiry.write`, `verification.read`, `report.write`, `webhook.read`). By default, API permissions are unrestricted until explicitly limited.

**OAuth Access Tokens:**

Persona also provides an endpoint to create an Access Token that can be used wherever an API Key would be used. Access tokens have a configurable expiration (number of seconds until the access token expires) and support a space-separated list of `permission:object` combinations for scoped access.

## Features

### Inquiries

Most businesses integrate with Persona using the Inquiries product. Inquiries represent end-to-end identity verification flows where users submit identity information (e.g., government IDs, selfies, personal details). Inquiries are created from Inquiry Templates that define the verification steps required. Inquiries can be pre-created via API and then completed by users via hosted flow, embedded flow, or mobile SDKs.

### Transactions

Instead of leveraging inquiries, you can directly create verifications, reports, or transactions via the API. It's recommended to use Transactions to then trigger subsequent verifications and reports through Workflows. Transactions are the primary mechanism for fully API-driven identity verification without front-end user interaction.

### Verifications

Verifications are broken up into Verification Types that focus on answering different identity claims: Government ID (genuine government-issued identity), Document (corroborating documents like SSN, bank statements, utility bills), Selfie (liveness and face matching to a government ID), and Database (matching user-provided data against authoritative records).

- Each verification runs a set of configurable checks that determine pass/fail outcomes.
- Verifications can be created individually or as part of an inquiry/transaction flow.

### Reports

Reports provide background checks and risk intelligence on individuals and businesses. Report types include:

- **Address Lookup** – validates address information.
- **Adverse Media** – screens against adverse media sources.
- **Business Adverse Media** – screens businesses against adverse media.
- **Watchlist / Business Watchlist** – screens against sanctions and watchlists.
- **Politically Exposed Person (PEP)** – screens for politically exposed persons.
- **Email Address** – enriches and validates email data.
- **Phone Number** – enriches and validates phone data.
- **Profile** – aggregates profile information.

### Accounts

Accounts represent unique individuals across your organization. They consolidate inquiries, verifications, and reports for a single person. Accounts can be created, archived, restored, consolidated (merged), tagged, and redacted.

### Cases

Cases support manual review workflows. They can be created, assigned to reviewers, resolved, and reopened. Useful for handling flagged inquiries or verifications that require human judgment.

### Lists

Lists allow you to manage sets of identifiers (e.g., email addresses, phone numbers, government IDs) for screening purposes such as blocklists or allowlists. List items can be created, updated, and removed programmatically.

### Workflows

Workflows automate business logic and processes, triggering actions based on verification results or other events. This approach is ideal for scenarios where you need full control over data processing, compliance checks, or fraud analysis.

### Graph

Graph provides relationship analysis between accounts, allowing detection of connections and patterns across verified individuals (e.g., shared devices, phone numbers, or addresses).

### Data Redaction

You can permanently delete personally identifiable information (PII) for a Verification. This action cannot be undone. This endpoint can be used to comply with privacy regulations such as GDPR / CCPA or to enforce data privacy.

## Events

Events are actions in the Persona system that you can use to trigger Webhooks and Workflows. Webhooks are configured in the Dashboard under Integration > Webhooks. Only enabled events in the specified environment will be sent to your application.

Webhook payloads are signed using HMAC and delivered via POST requests. Webhook Event Filters allow developers to be more selective with which events they receive.

### Account Events

Triggered when accounts are created, redacted, archived, restored, consolidated, or when tags are added/removed.

### Inquiry Events

Triggered on inquiry lifecycle changes: created, started, expired, completed, failed, marked for review, approved, declined, and transitioned (moving between steps in a dynamic flow).

### Inquiry Session Events

Triggered when a user starts, expires, or cancels a session on an inquiry (per-device sessions).

### Document Events

Triggered when documents are created, submitted, processed, or encounter processing errors.

### Selfie Events

Triggered when selfies are created, submitted, processed, or encounter processing errors.

### Verification Events

Triggered on verification lifecycle changes: created, submitted, passed, failed, requires retry, or canceled.

### Transaction Events

Triggered when transactions are created, redacted, or when their status is updated.

### Report Events

Triggered when reports complete processing (ready), encounter errors (errored), or produce matches (matched). Applies to all report types: address lookup, adverse media, business adverse media, watchlist, business watchlist, PEP, email address, phone number, and profile.

### Case Events

Triggered when cases are created, assigned, resolved, reopened, or updated.
