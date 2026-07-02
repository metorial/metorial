Now let me get the full API reference to understand all the features:Now let me check the full API endpoint list to understand all available features:Now I have enough information to write the specification.

# Slates Specification for Codacy

## Overview

Codacy is an automated code review and quality platform that performs static analysis, security scanning, code coverage tracking, and duplication detection across 49+ programming languages. It integrates with GitHub, GitLab, and Bitbucket to analyze repositories and report findings on pull requests. It also offers DAST (Dynamic Application Security Testing), SBOM generation, dependency scanning, and security risk management features.

## Authentication

Codacy uses **API token-based authentication**. There are two types of tokens:

### Account API Tokens

Account API tokens are defined at the Codacy user account level. Each account API token authorizes access to the same organizations, repositories, and operations as the roles and permissions of the owner of the account.

- Generate tokens via the Codacy UI under **Account > Access management > Create API token**.
- Tokens can have configurable expiration (7–90 days, custom, or no expiration).
- All API v3 endpoints that require authentication must use account API tokens.

### Repository API Tokens

Repository API tokens authorize access only to a specific repository.

- Generated via repository **Settings > Integrations > Create API token**, or programmatically via the API.
- Up to 100 tokens per repository.
- API v2 endpoints accept either account or repository API tokens.

### Usage

Include tokens in request headers using the format `api-token: <your account API token>` or `project-token: <your repository API token>`.

- Base URL for Codacy Cloud: `https://app.codacy.com/api/v3`
- For self-hosted instances: `https://<your Codacy instance domain name>/api/v3`
- Performing GET requests for public repositories doesn't require authentication.

## Features

### Repository Management

Add, list, and manage repositories connected to Codacy. Repositories can be added programmatically by specifying the Git provider (e.g., `gh` for GitHub Cloud, `gl` for GitLab Cloud, `bb` for Bitbucket Cloud) and the full repository path. You can also list repositories within an organization, including their analysis information such as grade, issue counts, and coverage.

- Supported Git providers: GitHub Cloud, GitHub Enterprise, GitLab Cloud, GitLab Enterprise, Bitbucket Cloud, Bitbucket Server.
- Requires admin permissions over the repository on the Git provider.

### Code Analysis & Issues

Retrieve analysis results for repositories, including code quality grades, issues, complexity, and duplication metrics. The `listFiles` endpoint retrieves code quality metrics for individual files, including grade, total issues, complexity, coverage, and duplication. You can search for issues in repositories by filtering on severity levels (e.g., Error, Warning).

- Results can be filtered by branch.
- Analysis data is available per commit, per pull request, and per file.
- Analysis progress can be monitored via the API.

### Pull Request Analysis

List pull requests from a repository, searchable by last-updated, impact, or merged status. Retrieve detailed analysis results for pull requests, including new issues introduced, quality gate status, and coverage metrics.

### Code Coverage

Upload and retrieve code coverage data for repositories. Coverage metrics include overall repository coverage, coverage variation per commit/pull request, and diff coverage for pull requests.

- Coverage data is uploaded via the Codacy Coverage Reporter CLI or API.
- Repository API tokens can be used for uploading coverage data.

### Tool & Pattern Configuration

Configure analysis tools by enabling and disabling their patterns for a repository. You can manage which static analysis tools are active on a repository and configure individual code patterns with custom parameters.

- Supports toggling tools on/off and enabling/disabling specific patterns.
- Can configure tools to use configuration files from the repository.

### Coding Standards

The API includes endpoints for creating, managing, and applying organization coding standards programmatically. Coding standards enable the analysis of multiple repositories with the same tool and code pattern configurations, ensuring consistent code quality across your organization.

- Codacy supports up to 10 coding standards per organization.
- Standards can be set as defaults for new repositories.

### Quality Gates & Gate Policies

Quality gates configure when Codacy reports pull requests and commits as not up to standards. Gate policies help ensure that Codacy uses the same quality gates across organization repositories.

- Configurable thresholds for issues, complexity, duplication, coverage variation, and diff coverage.

### Organization & People Management

Manage organizations, list organization members, and add people to Codacy programmatically. Retrieve organization-level reporting data including overall quality metrics across repositories.

- Supports listing organizations the authenticated user belongs to.
- Manage user roles and permissions within organizations.

### Security & Risk Management (SRM)

Search and manage security findings across your organization, including SAST issues, secrets detection, dependency vulnerabilities, and IaC scanning results. The `SearchSRMItems` endpoint can filter findings by status, DAST target URL, and other criteria.

### DAST (Dynamic Application Security Testing)

The App scanning feature allows organizations to scan Web Applications and APIs for security vulnerabilities. Via the API, you can create DAST targets, trigger scans, and retrieve results.

- Targets can be Web Apps (requiring only a URL) or APIs (REST requiring an OpenAPI spec URL, or GraphQL). API targets optionally support header-based authentication.
- Scans occur asynchronously.

### SBOM (Software Bill of Materials)

Search SBOM dependencies across repositories, including identifying which repositories use a specific dependency. Available via the `searchSbomDependencies` and `searchSbomRepositories` endpoints.

### API Token Management

Create, list, and revoke repository API tokens programmatically. Use the endpoint `createRepositoryApiToken` to create new repository API tokens.

### Reporting & Exports

Generate CSV exports of enterprise seat usage data. Retrieve security reports and organization-level metrics via the API for custom reporting and dashboards.

### Segments

Manage and sync organization segments (groupings of repositories) via the API, including retrieving segment keys and values.

## Events

The provider does not support events. Codacy removed the Jira, Slack, and Webhooks repository integrations in November 2023, and there's no plan to make these integrations available again. Codacy does offer a Slack integration for critical security issue notifications at the organization level, but this is a push notification mechanism configured within Codacy's UI, not a programmable webhook or event subscription API.
