Now let me get the full list of notification events:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Terraform Cloud

## Overview

Terraform Cloud (now branded as HCP Terraform) is HashiCorp's managed service for infrastructure-as-code workflows using Terraform. It provides remote state management, remote Terraform execution, workspace and team management, policy enforcement, and VCS integration for collaborative infrastructure provisioning.

## Authentication

Terraform Cloud uses **Bearer Token** authentication for all API requests. All requests must be authenticated with a bearer token, using the HTTP header `Authorization` with the value `Bearer <token>`.

The API base URL is `https://app.terraform.io/api/v2`. For HCP Europe organizations, use `https://app.eu.terraform.io/api/v2`.

There are four types of API tokens, each with different scopes:

- **User Tokens**: Each HCP Terraform user can have any number of API tokens, which can make requests on their behalf. These have the broadest permissions, based on the user's team memberships and organization roles. User tokens can be created in the UI under User Settings → Tokens, or via the API.

- **Team Tokens**: Each team can have one API token at a time. This is intended for performing plans and applies via a CI/CD pipeline. Team tokens inherit the team's workspace permissions.

- **Organization Tokens**: Each organization can have one API token at a time. This is intended for automating the management of teams, team membership, and workspaces. The organization token cannot perform plans and applies.

- **Audit Trails Tokens**: Each organization can have a single token that can read that organization's audit trails. Use this token type to authenticate integrations pulling audit trail data.

You can create user, team, and organization tokens with an expiration date and time. Once the expiration time has passed, the token is no longer treated as valid and may not be used to authenticate to any API.

## Features

### Workspace Management

A workspace is a group of infrastructure resources managed by Terraform. HCP Terraform manages infrastructure collections with workspaces instead of directories. A workspace contains everything Terraform needs to manage a given collection of infrastructure, and separate workspaces function like completely separate working directories. You can create, list, update, delete, lock, and unlock workspaces. Workspaces can be configured with execution mode (remote, local, or agent), Terraform version, working directory, auto-apply settings, and VCS repository connections.

### Runs and Plans

You can trigger and manage Terraform runs (plan, apply, destroy) within workspaces. HCP Terraform has three workflows for managing Terraform runs: the UI/VCS-driven run workflow, the API-driven run workflow, and the CLI-driven run workflow. Runs can be created, listed, approved, cancelled, discarded, or force-executed via the API. For the API-driven workflow, you upload configuration versions as `.tar.gz` files before triggering runs.

### Variable Management

You can create both environment variables and Terraform variables in HCP Terraform. Variables can be set at the workspace level or through reusable variable sets that apply to multiple workspaces. Variables can be marked as sensitive to protect secrets like API keys and credentials. Variable sets can be scoped to organizations, projects, or specific workspaces.

### Organization and Team Management

Manage organizations, teams, and team memberships. Teams can have granular permissions on workspaces including access to runs, variables, state versions, and workspace locking. Organization API tokens have permissions across the entire organization. They can perform all CRUD operations on most resources, but have some limitations.

### Policy Enforcement

Policies are rules that HCP Terraform enforces on runs in workspaces. You can use policies to validate that the Terraform plan complies with security rules and best practices. HCP Terraform policy enforcement lets you use the policy-as-code frameworks Sentinel and Open Policy Agent (OPA) to apply policy checks to HCP Terraform workspaces. Policies are organized into policy sets that can be applied globally or to specific projects and workspaces.

### State Management

Workspaces store and manage Terraform state files. You can list state versions, read current and historical state, download state files, and create new state versions. State outputs can be shared across workspaces using remote state access.

### Projects

Workspaces are organized into projects. Each workspace belongs to a project. Projects help organize workspaces and manage access at a higher level.

### VCS Integration

Connect workspaces to version control repositories (GitHub, GitLab, Bitbucket, Azure DevOps) to trigger runs automatically when code is pushed. Manage OAuth clients and tokens for VCS provider connections.

### Run Tasks

Run tasks integrate external services into the Terraform run pipeline. During the Pre-plan, Post-Plan, or Apply stages, you can invoke a run task that calls an external service's endpoint, enabling integration with vulnerability scanners, cost estimation tools, approval workflows, and other services.

### Run Triggers

Run triggers allow runs to queue automatically in your workspace when runs in other workspaces are successful. This enables workspace dependency chains.

### Health Assessments

HCP Terraform can perform automatic health assessments in a workspace. Health assessments include drift detection (whether real-world infrastructure matches Terraform configuration) and continuous validation (whether custom conditions continue to pass after provisioning). Available on Standard and Premium editions.

### Private Registry

Publish and manage private Terraform modules and providers within your organization through a built-in private registry.

### Audit Trails

Access organization audit logs to track actions performed by users and systems. Requires an audit trails token for authentication.

### Agent Pools

Manage agent pools for running Terraform operations on private or on-premises infrastructure. Agent pools have their own set of API tokens which allow agents to communicate with HCP Terraform, scoped to an organization.

## Events

Terraform Cloud supports webhook notifications for workspace and run events. HCP Terraform can use webhooks to notify external systems about run progress and other events. Each workspace has its own notification settings and can notify up to 20 destinations.

Webhook destinations can be generic (custom URL), Slack, Microsoft Teams, or Email. Generic webhooks can include an HMAC-SHA512 signature for authenticity verification using a configurable secret token.

### Run Events

Notifications about the lifecycle of Terraform runs within a workspace:

- **Created**: A run begins and enters the Pending stage.
- **Planning**: A run acquires the lock and starts to execute.
- **Needs Attention**: A plan has changes and requires user input to continue (e.g., approving the plan or a policy override).
- **Applying**: A run enters the Apply stage.
- **Completed**: A run completed successfully.
- **Errored**: A run terminated early due to error or cancellation.

### Workspace Health Events

Notifications about workspace health assessments (requires health assessments to be enabled, available on Standard/Premium editions):

- **Check failed**: HCP Terraform detected one or more failed continuous validation checks.
- **Drift detected**: HCP Terraform detected configuration drift for the first time, or a previously detected drift has changed.
- **Health assessment errored**: A health assessment failed. Health assessments fail when HCP Terraform cannot perform drift detection, continuous validation, or both.

### Auto Destroy Events

- **Auto destroy reminder**: Sends reminders 12 and 24 hours before a scheduled auto destroy run.
- **Auto destroy results**: HCP Terraform performed an auto destroy run in the workspace. Reports both successful and errored runs.

### Team Notification Events

HCP Terraform can use webhooks to notify external systems about run progress, change requests, and other events. Team notifications allow you to configure relevant alerts that notify teams whenever a certain event occurs. You can only configure team notifications to notify your team of change requests.
