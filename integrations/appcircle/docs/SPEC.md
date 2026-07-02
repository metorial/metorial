Let me get more details on the webhook event scopes and the API feature areas.Now let me check what API Key authentication looks like:Now I have enough information to write the specification.

# Slates Specification for Appcircle

## Overview

Appcircle is a mobile CI/CD platform that automates the build, test, sign, distribute, and publish lifecycle for iOS and Android applications. It supports frameworks like Swift/Objective-C, Java/Kotlin, React Native, and Flutter, and offers modules for build workflows, testing distribution, enterprise app store, and publishing to app stores (App Store, Google Play, Huawei AppGallery, Microsoft Intune).

## Authentication

Appcircle supports two authentication methods, both of which follow a two-step token exchange pattern:

### 1. Personal Access Key (User-level)

The Appcircle API supports authentication with a Personal Access Key. The key for each user will have the same permissions as the user within the organization, and each organization requires a separate Personal Access Key.

- Generate a Personal Access Key from the Appcircle dashboard under **My Organization > Security**.
- Exchange the key for a short-lived Personal Access Token (PAT) by calling the token endpoint:
  - **Endpoint:** `POST https://auth.appcircle.io/auth/v3/token`
  - **Content-Type:** `application/x-www-form-urlencoded`
  - **Body parameter:** `personalAccessKey=<your_access_key>`
- Use the generated PAT in an `Authorization` header on all subsequent API requests.

### 2. API Key (Organization-level)

The Appcircle API also supports authentication with an API Key. API Keys are typically used for service-to-service or automation scenarios where the authentication is not tied to an individual user. Each API Key is associated with an organization and can be managed from the organization's security settings.

- Create an API Key from **My Organization > Security > API Keys**. Select the organization and the roles that the API key should have access to.
- Exchange the key for an access token:
  - **Endpoint:** `POST https://auth.appcircle.io/auth/v1/api-key/token`
  - **Content-Type:** `application/x-www-form-urlencoded`
  - **Body parameters:** `name=<api_key_name>`, `secret=<api_key_secret>`, optionally `organizationId=<org_id>` for sub-organizations.
- Use the returned access token in the `Authorization` header for subsequent API calls.

**Base URLs:**

- Auth: `https://auth.appcircle.io`
- API: `https://api.appcircle.io`
- Self-hosted deployments use custom hostnames for both auth and API.

API keys have a name and an expiry date that cannot be modified after creation. Appcircle sets a default expiry of 6 months, which can be edited to last up to 1 year.

## Features

### Build Management

Appcircle fetches all branches and commits in a connected repository and lets you build any commit. Through the API you can manage build profiles, list branches, start and cancel builds, retrieve build logs, and download build artifacts. Builds can also be automated to trigger automatically with every push to a repository.

- Supports connecting repositories from GitHub, Bitbucket, GitLab, Azure DevOps, and SSH/public URLs.
- Builds can be triggered for specific branches, commits, and workflows.

### Workflow Configuration

You can customize your build flow using the workflow editor, which allows you to be in control of the build process. You can add or remove build steps and add custom scripts for advanced build processes.

- Workflows are associated with build profiles and can be listed and managed via the API.

### Signing Identities

Manage certificates, identifiers, profiles, keystores, and Apple device registrations. The API provides access to upload and manage iOS certificates, provisioning profiles, and Android keystores used for code signing.

### Testing Distribution

Distribute app builds via email, QR codes, and webhooks. Share .IPA, APK, and other file formats directly. Create test groups, automate distribution, and integrate with DevOps pipelines.

- Manage distribution profiles, upload binaries, and share builds with testing groups.
- Supports auto re-signing of binaries before distribution.

### Publish to Stores

Automate app store releases and manage submissions to App Store, Google Play, Huawei AppGallery, Microsoft Intune, and TestFlight from a single dashboard.

- Create and manage publish profiles, upload binaries, and initiate release flows.
- Customize publish flows with drag-and-drop design and custom script support.
- Track release status and manage approvals through the API.

### Enterprise App Store

You can create your own App Store for in-house distribution. The API allows managing Enterprise App Store profiles and deploying app versions for internal distribution, with support for SSO-based secure access.

### Environment Variables

Manage environment variable groups that are used during build workflows. Variables can be configured per profile or shared across profiles.

### Organization Management

Manage organization settings, team members, roles, and sub-organizations. Segment teams into independent sub-organizations. Advanced role management lets you assign module-specific permissions to every user.

## Events

Appcircle will notify external services via webhooks when a certain event occurs. When the events you specified happen, it sends a POST request in JSON format to the URLs you provide. Multiple webhooks can be created for different events and build profiles.

Webhooks are configured per organization under **My Organization > Notifications > Webhooks**. Each webhook can be scoped to specific event types and optionally to a specific profile. A shared secret can be set for HMAC-SHA256 payload verification via the `ac_signature` header.

### Build Events

Notifications for key build lifecycle events:

- Build started, succeeded, failed, canceled, timed out, completed with warnings.
- Fetch started, test report created.
- License retention policy updated.

### Signing Identity Events

Notifications related to certificate, keystore, and provisioning profile operations:

- iOS certificate and provisioning profile added, deleted, or approaching expiration.
- Android keystore created, uploaded, deleted, or approaching expiration.
- Apple device registered, updated, unregistered, or provisioned.
- Apple identifier created, deleted, or updated.

### Testing Distribution Events

Notifications for distribution-related activities:

- New version added or uploaded for distribution.
- App shared for testing distribution.

### Publish to Stores Events

Notifications for the store publishing lifecycle:

- Store status changed, new version deployed or uploaded.
- Version rejected.
- Publish step/flow starting, started, succeeded, failed, canceled, timed out, or restarting.
- Publish flow updated, succeeded, failed, canceled, or timed out.

### Enterprise App Store Events

Notifications for Enterprise App Store activities:

- New version deployed or uploaded to the Enterprise Store.
- App shared on Enterprise Store.
