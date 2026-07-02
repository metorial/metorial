Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Vercel

## Overview

Vercel is a cloud platform for building, deploying, and scaling web applications. It provides serverless compute, a global CDN, domain management, and CI/CD with Git-based deployments. The REST API allows programmatic management of projects, deployments, domains, environment variables, teams, and related resources.

## Authentication

Vercel supports two authentication methods for its REST API:

### Bearer Token (Access Token)

Vercel Access Tokens are required to authenticate and use the Vercel API. Include the token in the Authorization header: `Authorization: Bearer <TOKEN>`. Tokens can be created and managed at the level of your account, and can be scoped to only allow access for specific Teams. You can choose the scope from a list of Teams and set an expiration date for the token. Setting an expiration date is highly recommended as a standard security practice.

- **Base URL**: `https://api.vercel.com`
- **Header**: `Authorization: Bearer <TOKEN>`
- By default, you can access resources in your personal account. To access resources owned by a team, append the Team ID as a query string: `https://api.vercel.com/v6/deployments?teamId=[teamID]`.

### OAuth 2.0 (for Integrations)

Vercel supports OAuth 2.0 for third-party integrations that need to act on behalf of users. Vercel's Identity Provider uses the OAuth 2.0 authorization framework and also supports OpenID Connect (OIDC).

- **Authorization Endpoint**: `https://vercel.com/oauth/authorize`
- **Token Endpoint**: `https://api.vercel.com/login/oauth/token`
- **User Info Endpoint**: `https://api.vercel.com/login/oauth/userinfo`
- **OpenID Configuration**: `https://vercel.com/.well-known/openid-configuration`
- **Grant Type**: Authorization Code (with PKCE support)
- After approval, Vercel redirects the user back to your application's redirect_uri with a short-lived code in the code query parameter.
- Scopes decide what identity information from the user goes into the ID Token and whether to issue a Refresh Token.
- Available scopes for integrations include: Integration Configuration, Deployments, Deployment Checks, Edge Config, Projects, Project Environment Variables, Global Project Environment Variables, Teams, User, Log Drains, Drains, Domain, and Billing.

## Features

### Project Management

Create, list, update, and delete projects. Configure project settings such as build commands, output directories, framework presets, and Git repository connections. Transfer projects between accounts or teams.

### Deployment Management

Deploy new versions of web applications, manage custom domains, retrieve information about deployments, and manage secrets and environment variables for projects. Trigger deployments programmatically, cancel in-progress deployments, list deployment history, and promote deployments to production. Supports rolling releases with staged traffic shifting.

### Domain & DNS Management

Register, transfer, renew, and configure domains. Manage DNS records and nameservers. Add or remove domains from projects, configure SSL certificates, and set up domain redirects. Supports multi-tenant domain assignment.

### Environment Variables

Create, read, update, and delete environment variables for projects. Variables can be scoped to specific environments (production, preview, development). Supports sensitive/encrypted variables and shared variables across projects.

### Team Management

Manage team members, roles, and access groups. Invite or remove members, update roles (admin, member, viewer), and configure team-level settings. Supports RBAC with project-level roles and access groups.

### Edge Config

Create and manage Edge Config stores for ultra-low-latency reads at the edge. Read and update Edge Config items. Useful for feature flags, A/B testing configuration, and other key-value data that needs to be globally available with minimal latency.

### Log Drains

Configure log drains to forward runtime logs, build logs, and other telemetry to external services. Supports multiple drain types and destinations.

### Deployment Checks

Register custom checks that run against deployments before they are promoted. Checks can block or allow deployments based on custom validation logic (e.g., performance testing, security scanning).

### Deploy Hooks

Vercel's Deploy Hooks allow you to create URLs that accept HTTP POST requests to trigger deployments and re-run the build step of your frontend application. Useful for triggering redeployments from external systems like a headless CMS.

### Cron Jobs

Schedule recurring tasks that invoke Vercel Functions on a defined schedule using cron expressions.

### Blob Storage

Upload, download, list, and delete files using Vercel Blob storage. Supports both server-side and client-side uploads.

### Firewall & Security

Configure Web Application Firewall rules, rate limiting, IP blocking, and custom security rules. Manage DDoS protection settings and bot management configuration.

### Access Groups

Create and manage access groups for fine-grained RBAC. Assign projects to access groups and manage group membership.

### Billing

Retrieve billing and usage information, manage spending controls, and view invoices.

## Events

Vercel supports webhooks that deliver HTTP POST requests to a configured endpoint when specific events occur. Only Pro and Enterprise teams are able to configure these webhooks at the account level. Webhooks can be scoped to specific projects or apply to all projects. Payloads are signed with an `x-vercel-signature` header using HMAC SHA1 for verification.

### Deployment Events

Track the full deployment lifecycle: creation, readiness, success (after checks pass), promotion to production, errors/failures, cancellations, and cleanup (removal due to retention policies). Also includes events for deployment integration actions (start, cancel, cleanup) and check re-request events.

### Project Events

Monitor project lifecycle changes: creation, removal, and renaming. Only fires when the integration has access to all projects in the scope.

### Project Domain Events

Track domain changes at the project level: domain added, removed, updated, moved between projects, verified, and unverified.

### Domain Events

Monitor account-level domain operations: domain creation, DNS record changes, SSL certificate lifecycle (added, renewed, deleted, failures), domain renewal and renewal failures, auto-renew setting changes, and domain transfer status (started, completed, failed).

### Rolling Release Events

Track rolling release progression: started, stage approved, completed, and aborted.

### Integration Configuration Events

Monitor integration installation changes: removal, permission upgrades, scope change confirmations, and transfers between teams.

### Integration Resource Events

Track when integration resources are connected to or disconnected from projects.

### Marketplace Events

Monitor marketplace billing activity: invoice created, paid, not paid, and refunded. Also includes member role change events for installations.

### Alert Events

Receive notifications when observability alerts are triggered, including anomaly detection metrics and thresholds.
