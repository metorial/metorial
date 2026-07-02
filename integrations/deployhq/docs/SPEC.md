# Slates Specification for DeployHQ

## Overview

DeployHQ is a deployment service that automates deploying code from version control repositories (Git, SVN, Mercurial) to servers. It streamlines the process of deploying code from repositories to servers, automating the traditionally manual process of transferring files. It supports integration with popular platforms such as GitHub, Bitbucket, and GitLab, and can deploy via SSH/SFTP, FTP, S3, Cloudflare R2, Shopify, Netlify, Elastic Beanstalk, and other protocols.

## Authentication

DeployHQ uses **HTTP Basic Authentication** for all API requests.

- Users are provided with an API key which can be found from the "Security" page within the "Settings" menu. It's a 40-character string which must be used with your username in order to authenticate. All API requests should be sent with HTTP Basic Authentication with your username (email address) and API key.
- Requests should be made to `https://<account>.deployhq.com/` replacing `<account>` with the name of your account.
- You can create a new API key by entering a description and clicking Create API Key. Make sure to note the key as it will be displayed only once.

Three credentials are required:

1. **Account name** — your DeployHQ subdomain (used in the base URL)
2. **Email address** — used as the HTTP Basic Auth username
3. **API key** — used as the HTTP Basic Auth password

Example request:

```
curl -H "Content-type: application/json" \
     -H "Accept: application/json" \
     --user your-email@example.com:YourAPIKey \
     https://your-account.deployhq.com/projects
```

API access is restricted by pricing plan as of September 2025. Not all plans include API access, and some accounts may have API access disabled.

## Features

### Project Management

Create, update, list, and delete projects. Projects connect a source code repository to one or more deployment servers. Each project is identified by a permalink (slug).

### Server Management

Add, update, and manage servers within a project. Servers represent deployment targets and support multiple protocol types including SSH/SFTP, FTP, Amazon S3, Cloudflare R2, Shopify, Netlify, and AWS Elastic Beanstalk. Servers can be configured with settings like hostname, path, branch, and atomic deployment strategy.

### Server Groups

Servers can be organized into groups for coordinated deployments. The API has endpoints for projects, servers, server groups, templates, config files, and more.

### Deployment Management

You can create and manage projects, trigger deployments, check deployment status, view logs, and integrate DeployHQ into your CI/CD pipeline or custom tooling. Deployments can be targeted to a specific server or server group, with options to specify start and end revisions, whether to copy config files, and whether to run build commands. Preview deployments can also be created to see potential file changes before deploying.

### Scheduled Deployments

When scheduling a deployment using the API, the following data must be sent in addition to the normal parameters for a deployment: at — Use future, daily, weekly or monthly to schedule a new deployment. Scheduled deployments can be listed and managed per project.

### Configuration Files

Manage static configuration files that are uploaded to servers during deployment but are not stored in the repository. Config files can also be attached to server groups.

### SSH Commands

Configure commands to run directly on servers before or after a deployment.

### Build Pipelines

Build pipelines are a series of commands that run before your code is deployed to servers. They allow you to automate tasks like installing dependencies, compiling assets, running tests, and preparing your application for deployment. Build pipelines can be configured on a per-server basis.

### Templates

Use templates in DeployHQ to share common configuration between projects. Templates allow reusing server, integration, and build configuration across multiple projects.

### Integrations

DeployHQ offers a wide range of integrations: Notifications (Slack, Discord, Microsoft Teams, Email), Monitoring & Error Tracking (New Relic, Rollbar, Sentry, Bugsnag, Honeybadger), Services (Shopify cache clearing, Cloudflare cache purging), and Custom HTTP POST webhooks for custom integrations.

### Rollbacks

Deployments can be rolled back to a previous revision, allowing quick recovery from failed releases.

## Events

DeployHQ supports outbound webhook notifications via its **HTTP POST integration** and other notification integrations. These are configured per-project under Integrations.

### Deployment Lifecycle Events

You can independently toggle notifications for three distinct deployment events:

- **Deployment Started** — fires when a deployment begins.
- **Deployment Succeeded** — fires when a deployment completes successfully.
- **Deployment Failed** — fires when a deployment fails.

These events can be configured with the following options:

- Choose when to trigger the integration, and choose any servers you wish to trigger it for, or keep the option checked if you want to trigger for all servers.
- Notifications fire based on the configured triggers regardless of whether the deployment was started manually, via automatic hooks, or through the DeployHQ API.

DeployHQ does not provide a generic webhook subscription API for arbitrary event types. Outbound notifications are limited to deployment lifecycle events and are configured through the project integrations settings (or via HTTP POST webhooks for custom endpoints).
