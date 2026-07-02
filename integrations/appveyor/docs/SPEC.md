# Slates Specification for Appveyor

## Overview

AppVeyor is a hosted continuous integration and continuous delivery (CI/CD) service for building, testing, and deploying software. It runs on Microsoft Windows (and Linux), and provides a RESTful API to interact with the service, including managing projects, builds, deployments, and teams.

## Authentication

AppVeyor uses bearer token authentication. The token can be found on the API token page under your AppVeyor account. The token must be set in the `Authorization` header of every request:

```
Authorization: Bearer <token>
```

The API token can be acquired from https://ci.appveyor.com/api-token.

AppVeyor has two types of API keys:

- **Account-level key (v1):** This references a single account and only has control over that specific account.
- **User-level key (v2):** This references all accounts and has complete control over all accounts the user has access to. When using a v2 key, API calls must be prepended with `/api/account/{accountName}/` to disambiguate which account is being accessed.

The base URL for the API is `https://ci.appveyor.com/api`.

## Features

### Project Management

Manage CI/CD projects linked to source code repositories. You can list projects, get project details with last build info, get project settings (including in YAML format), add new projects, update project settings, update environment variables, update build numbers, and delete projects. Projects can be linked to repositories from GitHub, Bitbucket, and other Git providers.

### Build Management

Trigger and manage builds for projects. You can start builds of a branch's most recent commit, start builds of specific commits, re-run builds, start builds for pull requests, cancel running builds, delete builds, and download build logs. Builds can be started with custom environment variables. Build artifacts (files produced during a build) can be listed and downloaded per build job.

### Deployment Environments

Environment deployment can be triggered manually or through the API to deploy a "green" build to an existing environment, with results tracked in the deployment console. You can create, list, update, and delete deployment environments. Supported deployment providers include Web Deploy, FTP/SFTP, Azure (Blob, Cloud Service, App Service), Amazon S3, Elastic Beanstalk, NuGet, GitHub Releases, Octopus Deploy, Webhook, and others.

### Deployment Management

Start new deployments to environments, get deployment details, and view deployment history for projects and environments. Deployments link a specific build version to a target environment.

### Team Management

The Team page allows adding new users or collaborators to your AppVeyor account. An account is an entity grouping all other resources like projects, environments, and users. Through the API you can:

- **Users:** List, get, create, update, and delete users within an account.
- **Roles:** List, get, create, update, and delete roles. A role is a set of permissions that belongs to an account. Every account has two built-in roles: "Administrator" and "User." Custom roles can be created with granular permissions for projects, environments, and account settings.
- **Collaborators:** Add existing AppVeyor users from other accounts as collaborators, each assigned a role from the target account.

### Build Cache Management

Delete project build caches through the API. Build caches are used to speed up builds by persisting files between builds.

### Value Encryption

Encrypt sensitive values (such as tokens or passwords) for safe use in YAML configuration files.

## Events

AppVeyor supports webhook notifications that are defined on the project level and triggered on build success or fail events.

### Build Notifications (Outbound Webhooks)

You can configure notifications per project with various providers, including a generic Webhook provider. Available trigger conditions include:

- `on_build_success` — when a build succeeds
- `on_build_failure` — when a build fails
- `on_build_status_changed` — when the build status changes from the previous build

When a webhook notification triggers, AppVeyor makes a POST request to the configured URL and passes JSON data in the body containing event name, build details (project name, build version, status, duration, commit info, branch, pull request info, etc.).

The webhook body and content type can be fully customized using Mustache templates, allowing integration with arbitrary external services.

### Deployment Webhooks

AppVeyor supports a Webhook deployment provider that calls an arbitrary external URL using a POST request when a deployment occurs. The payload includes account info, project details, build info, commit metadata, artifact details, and environment variables. An optional authorization header can be configured for the request.
