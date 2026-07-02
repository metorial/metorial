Now I have enough information. Let me compile the specification.

# Slates Specification for Npm

## Overview

npm (Node Package Manager) is the default package registry for Node.js, hosting millions of JavaScript packages. It provides a REST API at `registry.npmjs.org` for querying package metadata, searching packages, retrieving download statistics, managing access tokens, and publishing packages. A separate download counts API is available at `api.npmjs.org`.

## Authentication

The npm registry API supports multiple authentication methods, all using Bearer tokens in the `Authorization` header:

1. **npm Session Token**: Traditional npm session tokens created via `npm login`, tied to a user account with limited expiration. Required for user account management and token creation/management.

2. **npm Access Token (Granular Token)**: Fine-grained tokens with specific permissions. Tokens can be created with customizable permissions, scope restrictions, expiration, and CIDR IP range limitations. Tokens can be scoped to specific packages, organizations, and operations (read-only, read-write). Read-write tokens have a maximum 90-day lifetime (default 7 days); read-only tokens have no maximum (default 30 days).

3. **OIDC Token Exchange (for CI/CD)**: Exchange a valid OIDC id_token (provided as a Bearer token) for a short-lived npm registry access token for the specified package. The Bearer token must be an OIDC id_token from an Identity Provider (IdP) npm supports. Supported providers include GitHub Actions, GitLab CI, and CircleCI. The `aud` claim must be set to `npm:registry.npmjs.org`. The resulting exchange token is typically valid for 1 hour.

**Two-Factor Authentication (2FA)**: Many write operations require a one-time password via the `npm-otp` header. If 2FA is enabled on the account, provide the OTP from your configured 2FA method. If 2FA is not enabled, an email OTP may be sent automatically.

**Public endpoints** (package metadata, search, download counts) do not require authentication.

**Format**: `Authorization: Bearer <token>`

## Features

### Package Metadata Retrieval

Package metadata describes a package for its consumers: who wrote it, where its repository is, and what versions of it have been published. It also contains a description of each version of a package present in the registry, listing its dependencies, giving the url of its tarball, and so on. Two formats are available: full metadata and an abbreviated format containing only installation-relevant data. For some packages in the registry, the full metadata is over 10MB uncompressed.

### Package Search

Search for packages by text query at the `/-/v1/search` endpoint. The values of quality, popularity, and maintenance are normalized into a unit-vector; provide values between 0–1 for each to modify weightings. Supports keyword parameters such as `author:`, `scope:`, and `keywords:` within the text query.

### Download Counts

There is a public API that gives you download counts by package and time range. Available via `api.npmjs.org`. Two modes are available:

- **Point**: Gets the total downloads for a given period, for all packages or a specific package.
- **Range**: Gets the downloads per day for a given period, for all packages or a specific package.
- **Per-version downloads**: Download count for specific versions of a package are only available for the previous 7 days.
- Bulk queries support up to 128 packages at a time. Scoped packages are not yet supported in bulk queries.

### Package Publishing and Management

Packages can be published to the registry via the API (PUT request). Specific versions can be unpublished or deprecated. On the official npm registry, npm unpublish is only available during the first 24 hours after a package is published. The package deprecate API is preferable to unpublish as it leaves the package available for anything that depends on it, but informs the user that a newer version should be used instead. Distribution tags (dist-tags) can be managed to label specific versions (e.g., `latest`, `next`).

### Access Token Management

Token management endpoints for creating, listing, and deleting npm access tokens. Tokens can be configured with:

- Specific package, scope, and organization access
- Read-only or read-write permissions
- CIDR IP range restrictions
- Custom expiration
- 2FA bypass capability

### Trusted Publishers (OIDC)

This allows users with write permission to the package to establish trust with CI/CD providers (GitHub Actions, GitLab CI, CircleCI, etc.) so that those services can publish to the package without requiring long-lived npm tokens. Trusted publisher configurations can be added, listed, and deleted per package. Requires 2FA to be enabled on the account.

## Events

The provider does not support events. Starting July 16, 2024, npm deprecated the hooks services, including npm hooks API Endpoints and its related CLI npm hook command. The npm hooks services were launched as Beta in 2016 so users could be notified of changes in npm packages, owners, or scopes. The service never achieved full GA maturity and was sunset in favor of ongoing investments for the npm platform. There is currently no webhook or event subscription mechanism available.
