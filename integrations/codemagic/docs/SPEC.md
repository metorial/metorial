# Codemagic Specification

## Overview

Codemagic is a CI/CD service focused on building, testing, and deploying mobile applications. It supports Flutter, React Native, native iOS/Android, Unity, .NET MAUI, and other frameworks across macOS, Linux, and Windows build machines. The platform provides a REST API for programmatic access to manage applications, trigger builds, handle artifacts, and manage environment variables and secrets.

## Authentication

Authentication with Codemagic APIs is performed using a Codemagic API token. The Codemagic API token is a personal token that is unique to each Codemagic user.

The actions permitted by the token are determined by the user's role within the team.

**Obtaining the token:** You can find your API token under Account settings > API token.

**Using the token:** When making API calls, include the API token in the `x-auth-token` request header.

Example:

```
curl -H "Content-Type: application/json" \
     -H "x-auth-token: <API Token>" \
     https://api.codemagic.io/apps
```

**Token regeneration:** Click Revoke to disable the current token. Clicking Show afterward generates a new token.

There is only one authentication method (API token). There are no OAuth flows, scopes, or additional credentials required.

Use `get_current_user` to retrieve the connected user ID, optional avatar URL, and permissions keyed by resource ID.

## Features

### Application Management

Add, list, and retrieve applications connected to Codemagic. Applications can be added from public or private repositories by providing the repository URL and optionally an SSH key for private repos. You can list all applications or retrieve details for a specific application, including branches and workflow information.

- Unlike with Workflow Editor, information about workflows in codemagic.yaml is not stored in Codemagic and is therefore not available before starting a build and cloning the repository. Therefore, the API does not return workflow information such as workflowId for codemagic.yaml workflows.

### Build Management

Start new builds, cancel running builds, and retrieve build status. When starting a build, you specify the application ID, workflow ID, and a branch or tag.

- You can pass custom environment variables, variable groups, software version overrides (e.g., Xcode version, Flutter version), labels, and instance type (machine type) when triggering a build.
- The workflow and branch information is passed with the curl request when starting builds from an API request. Any configuration related to triggers or branches in Flutter workflow editor or codemagic.yaml is ignored.

### Artifact Management

Artifact download URLs can be obtained using the Builds API or copied directly from the Codemagic UI. Use `download_artifact` with the authenticated URL from `get_build` to prepare a downloadable file. You can also generate public download URLs with configurable expiration times using `create_artifact_url`.

- Please take extra care when sharing public download URLs so as to not expose them. Anyone with access to a public download URL will be able to download your build artifact.

### Cache Management

List, delete all, or delete specific build caches for an application. Each cache is associated with a specific workflow and includes metadata like size and last usage time.

Deletion is accepted asynchronously. The tool returns `deletionStarted` and the cache IDs queued for removal; `deleted` remains false until completion is confirmed. List caches again to check whether removal has completed.

### Environment Variables and Secrets

For apps configured using codemagic.yaml, the API provides Secrets and Environment Vars endpoints for managing environment variables. Variables are organized into groups and can be defined at the application level or the team (global) level. Variables can be marked as secret for encrypted storage.

- Variables can be added to groups via the API, for example using the `/api/v3/variable-groups/{variable_group_id}/variables` endpoint.
- Use `list_variable_groups` to discover application group IDs before calling `add_variables`. The list supports page number and page size and returns the current and total page counts. Team-level group discovery is not exposed by this tool.

## API References

- [API overview and authentication](https://docs.codemagic.io/rest-api/codemagic-rest-api/)
- [Applications API](https://docs.codemagic.io/rest-api/applications/)
- [Builds API](https://docs.codemagic.io/rest-api/builds/)
- [Artifacts API](https://docs.codemagic.io/rest-api/artifacts/)
- [Caches API](https://docs.codemagic.io/rest-api/caches/)
- [Current API reference](https://codemagic.io/api/v3/schema)
- [Current OpenAPI schema](https://codemagic.io/api/v3/schema/openapi.json)

## Events

The provider does not support outbound webhooks or event subscriptions that notify external systems about Codemagic events (e.g., build completed). Codemagic _receives_ inbound webhooks from Git providers (GitHub, GitLab, Bitbucket, etc.) to trigger builds automatically based on push, pull request, and tag events, but it does not provide a mechanism to subscribe to or receive notifications about Codemagic-side events via webhooks or server-sent events.
