Now let me get the full list of OAuth scopes:# Slates Specification for Google Tag Manager

## Overview

Google Tag Manager (GTM) is a tag management system that allows users to configure and deploy tracking tags (such as analytics and marketing pixels) on websites and mobile apps without modifying site code. The GTM API (v2) provides programmatic access to manage GTM configuration data including accounts, containers, workspaces, tags, triggers, variables, versions, and user permissions.

## Authentication

Applications must use OAuth 2.0 to authorize requests to the Tag Manager API. Various OAuth 2.0 flows cater to web server, client-side, installed apps, and service account use cases, each with specific authentication steps.

**Setup:**

1. To get started using Tag Manager API, you need to first use the setup tool, which guides you through creating a project in the Google API Console and enabling the API.
2. From the Credentials page, click Create credentials > OAuth client ID to create your OAuth 2.0 credentials or Create credentials > Service account key to create a service account.

**Credentials needed:**

- You need to obtain credentials, i.e., client ID and client secret, by creating a project in the Google Developers Console.

**Authorization endpoint:** `https://accounts.google.com/o/oauth2/v2/auth`
**Token endpoint:** `https://oauth2.googleapis.com/token`

**Service Accounts:** A Google service account is used as a way to provide access to your data to support server to server interactions. For service accounts, click Create credentials > Service account key. Choose whether to download the service account's public/private key as a standard P12 file, or as a JSON file that can be loaded by a Google API client library. The service account email must be granted access to the relevant GTM account or container.

**Available OAuth 2.0 Scopes:**

| Scope                                                               | Description                                                                      |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/tagmanager.readonly`               | View your Google Tag Manager container and its subcomponents                     |
| `https://www.googleapis.com/auth/tagmanager.edit.containers`        | Manage your container and its subcomponents, excluding versioning and publishing |
| `https://www.googleapis.com/auth/tagmanager.edit.containerversions` | Manage your container versions                                                   |
| `https://www.googleapis.com/auth/tagmanager.delete.containers`      | Delete your Google Tag Manager containers                                        |
| `https://www.googleapis.com/auth/tagmanager.manage.accounts`        | View and manage your Google Tag Manager accounts                                 |
| `https://www.googleapis.com/auth/tagmanager.manage.users`           | Manage user permissions of your account and container                            |
| `https://www.googleapis.com/auth/tagmanager.publish`                | Publish your Google Tag Manager container versions                               |

## Features

### Account Management

The Google Tag Manager API grants authorized users access to Google Tag Manager configuration data, allowing management of accounts, containers, workspaces, tags, triggers, and other related entities. Users can list and update GTM accounts they have access to.

### Container Management

Each user's Account can have one or more Containers, each of which can have one or more Workspaces. Containers can be created, listed, updated, and deleted. You can also retrieve the tagging snippet for a container. Containers support different types: web, AMP, iOS, Android, and server.

### Workspace Management

A Workspace allows multiple concurrent modifications to a container's Variables, Built-In Variables, Triggers, Folders, and Tags. Workspaces are fundamental to many interactions with the API. Basically, when you work with tags, triggers, variables, folders, and built-in variables, you always need to provide the workspace ID with which you are interacting. Workspaces can be created, listed, updated, deleted, synced with the latest container version, and resolved for conflicts.

### Tag Management

You can use the API to create, read, update, and delete tags, triggers, and variables, as well as manage user permissions and settings. Tags are created within a workspace and can be configured with type, firing triggers, blocking triggers, and parameters. By using the GTM API, you can write a script that will create a tag or set of tags under multiple containers. This can be done in minutes, and much of the script can be reused for future deployments.

### Trigger Management

Triggers define when tags should fire. They can be created, read, updated, and deleted within a workspace. Trigger types include pageview, click, form submission, custom events, history changes, and more.

### Variable Management

Variables store dynamic values used by tags and triggers. Both custom variables and built-in variables can be managed. Built-in variables can be enabled or disabled within a workspace.

### Version Management

The API's resources are organized hierarchically, enabling the creation, preview, and publishing of versions, as well as the management of user permissions at the account level. Versions represent snapshots of a container's configuration. You can create versions from workspaces, list version headers, get version details, publish versions to make them live, and revert to previous versions.

### Environment Management

Environments allow previewing and testing container configurations before publishing. You can create, update, list, and delete environments, and generate authorization codes for preview URLs.

### Folder Management

Folders provide organizational grouping for tags, triggers, and variables within a workspace. You can create, list, update, and delete folders, as well as move entities between folders.

### User Permission Management

Use the API to manage accounts, containers and container versions, tags, rules, triggers, variables, and user permissions. Permissions can be granted at the account or container level with different access levels (e.g., read, edit, approve, publish).

### Custom Templates

Custom tag templates can be managed within workspaces. Templates can be created, listed, updated, and deleted.

### Destinations and Transformations

The API supports managing destinations (linked services) and transformations (data modifications) within workspaces.

## Events

The Google Tag Manager API does not support webhooks or event subscriptions. There is no built-in mechanism to receive notifications when changes occur in a GTM account or container.
