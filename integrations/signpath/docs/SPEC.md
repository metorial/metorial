# Slates Specification for Signpath

## Overview

SignPath is a code signing platform that provides secure, policy-driven signing of software artifacts (e.g., Authenticode, Java, macOS, Docker, Office macros) with HSM-backed key storage. It integrates with CI/CD systems to automate signing requests, enforce signing policies, verify build origin, and maintain audit trails. It is available as SaaS, self-hosted, or hybrid.

## Authentication

SignPath uses bearer authentication. You need to provide these values for every single API request.

**API Token (Bearer Token)**

- You need an API token to access the API, whether directly or through any connector.
- Tokens are generated in the SignPath UI under user profile settings. API tokens are only displayed when generated. Store them in a safe location. If an API token is lost, you need to regenerate it, potentially invalidating existing configurations using the previous token.
- Every request requires the `Authorization: Bearer <API_TOKEN>` header.
- Every API request is scoped to an **Organization ID**, which is included in the URL path (e.g., `https://app.signpath.io/API/v1/{OrganizationId}/...`).

**User types for API access:**

- CI user accounts are primarily used to integrate SignPath into your build automation. They can also be used for other automation tasks. You may need to consider adding roles to CI users for those. CI users can only authenticate with an API token.
- You can add an API token to your own user account for personal API access.

**Required inputs for authentication:**

- `API_TOKEN`: A bearer token generated per user or CI user account.
- `ORGANIZATION_ID`: Your SignPath organization identifier, included in all API URL paths.

## Features

### Signing Request Submission

Submit artifacts for code signing via the REST API. You provide the project slug, signing policy slug, artifact configuration slug, the artifact file, and an optional description. For hash data, fast signing requests are recommended. These requests are performed immediately without queuing, and the API immediately returns the signed artifact. Provide the additional field `IsFastSigningRequest` with the value `true`.

- Key parameters: `ProjectSlug`, `SigningPolicySlug`, `ArtifactConfigurationSlug`, `Artifact` (file), `Description`, `IsFastSigningRequest`, and user-defined `Parameters.*` fields.
- Supports automatic handling of complex formats (e.g., EXEs in MSIs, macros in DOCMs, DLLs in ZIPs).

### Signing Request Status & Artifact Retrieval

Query the status of a signing request by its ID. The response includes status, project info, signing policy info, and links to download both unsigned and signed artifacts.

### Signing Request Resubmission

You can resubmit an existing signing request and specify a different signing policy. This is especially useful when you build a release candidate, and want to postpone the release decision until later. Origin verification is evaluated based on the original signing request's origin data. This ensures that the integrity of the signing request and artifact are preserved even when fully detached from the actual build process.

### Signing Request Approval & Denial

A release management or workflow system might be used to submit the re-signing request and/or provide the approval using SignPath REST APIs. The API supports approve/deny operations on signing requests.

- You can specify that one or more approvals are required before a signing request is processed. This is typically used for release-signing.

### Project & Signing Policy Management

The REST API supports listing all projects as well as modifying projects, signing policies, and artifact configurations. Additional routes are available for (de)activating certificates, projects, signing policies and artifact configurations, and for the "delete private key" certificate operation.

- Signing policies declare the rules and permissions for signing with a specific certificate. A typical project has signing policies for test-signing and release-signing.

### Certificate Management

The API provides routes to retrieve certificate metadata and to directly download X.509 certificates or GPG public key files for a signing policy.

### Signing Policy Information (Crypto Provider)

You can retrieve information about a signing policy, including the X.509 certificate and RSA key parameters. If project and signing policy are not specified, the API returns all signing policies where the user identified by the API token is assigned as Submitter.

### User Information

The API includes a route for retrieving the current interactive user's information (`/InteractiveUsers/Me`).

### Audit Log

An Audit Log REST API is available (in preview). SignPath maintains a full audit log for each signing request, but also for administrative changes (users, certificates, projects, signing policies and artifact configurations).

## Events

SignPath supports webhooks for signing request status changes.

### Signing Request Status Changes

You can add a Webhook notification in your project's Integration section to react on completed signing requests. Notifications are sent for the following status changes: Completed, Failed, Denied and Canceled. The webhook payload includes the Organization ID, Signing Request ID, and Status.

- The webhook URL is configured per project.
- Webhooks will send the Authentication header exactly as specified in the project configuration, allowing you to secure the receiving endpoint.
- A handler for this Webhook can use the Web API for further activities, such as pushing the signed artifact to a repository. Use the Web API to get signing request data including build information.
