# Slates Specification for Aha!

## Overview

Aha! is a product development platform that includes modules for roadmapping, idea management, knowledge bases, and agile development. It provides a REST API for creating, reading, updating, and deleting product management records such as features, ideas, releases, goals, initiatives, and epics.

## Authentication

Aha! supports two authentication methods. OAuth2 is the preferred technique since it avoids the need to provide your Aha! credentials to an external application.

### API Key

API keys can be generated through the Aha! user interface. Each API key is specific to a user and an account and will grant access to that account with the permissions of the user that generated it. One user can have multiple API keys and they can be revoked independently. An API key will continue to work even if the user changes their password.

To generate an API key: navigate to **Settings → Personal → Developer → Generate API key**.

The API key is passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <API_KEY>
```

All requests must be made to the account-specific domain: `https://<subdomain>.aha.io/api/v1/`.

### OAuth2

An external application must be registered with Aha! before it can use OAuth2 to authenticate users. To register, go to **Settings → Personal → Developer → OAuth applications → Register OAuth application**. You will receive a Client ID and Client Secret.

To authorize an external application to authenticate as a user, the application uses browser redirects to send the user to Aha!. Aha! supports the OAuth2 authorization code flow (suitable for server based applications), and implicit grant flow (suitable for browser based applications).

**Endpoints:**

- Authorization: `https://<subdomain>.aha.io/oauth/authorize`
- Token exchange: `https://<subdomain>.aha.io/oauth/token`

If you don't know the user's subdomain, you can send them to `https://secure.aha.io/oauth/authorize` instead. The redirect will include an `account_subdomain` parameter. If the user was sent to secure.aha.io at the start of the flow, this parameter contains the subdomain of that user's account. You can use this subdomain for the request access token flow or for making API requests.

**Important:** The `subdomain` is a required custom input. All API requests must be scoped to `https://<subdomain>.aha.io`.

## Features

### Product & Workspace Management

Manage products (workspaces) and product lines. List products in an account, create new ones, and configure their settings.

### Strategy Management

Define and track strategic elements including goals, initiatives, strategic models, visions, and positionings. Goals can have key results (OKRs). Initiatives link strategy to execution by connecting to releases, epics, and features. Progress can be tracked and updated on all strategic records.

### Release Management

Create and manage releases and release phases/milestones within products. Releases can be associated with goals and initiatives, and can be organized into roll-up releases that aggregate across multiple products.

### Feature & Epic Management

Features can be listed unfiltered, or filtered by release, product, or epic. All these means of listing features can be further filtered by specific criteria like name, modification date, tag, or assignee. Once you have the id of a specific feature, you can inspect, modify, or delete them. Features can have requirements as sub-items. Features can be converted to epics and requirements can be converted to features. Features support scores, tags, watchers, custom fields, and progress tracking.

### Idea Management

Create, list, update, and delete ideas. Ideas can be submitted to idea portals, categorized, scored, tagged, and promoted to features, epics, or initiatives. Supports idea votes (including proxy votes on behalf of customers), idea comments (with visibility controls), idea subscriptions, and idea organizations. Ideas can be searched by term and managed across portals.

- If you don't want the idea to be submitted to any portal, you can skip this by setting `skip_portal: true` in the request body.

### Ideas Portal Management

List idea portals in a product or across the account. Manage portal users, their permissions, and their subscription preferences for portal summary emails.

### Comments & Attachments

Comments can be added to and listed as a sub-resource on any resource that supports them. These resources support comments: Features, Epics, Requirements, Ideas, Initiatives, Goals, Releases, Release phases, and To-dos. Attachments can be added to comments, record descriptions, custom fields, and to-dos (via direct upload or link).

### To-dos, Tasks & Approvals

Create and manage to-dos, tasks, and approvals. To-dos can be associated with features, releases, requirements, epics, and ideas. They support multiple assignees, due dates, and status updates.

### Users & Teams

Manage account users (create, update, list) with roles including contributor and viewer. Manage teams, team memberships, and virtual team members. Configure user product roles and custom roles.

### Custom Fields & Layouts

List and manage custom fields and their options. Manage custom layouts. Custom fields are available on most record types and support both scalar and tag-like values.

### Custom Tables

Create and manage custom table records and link them to standard records like features, ideas, releases, goals, initiatives, and requirements.

### Notes & Knowledge Base

Create and manage notes within products. Notes can be published to knowledge bases. List and search published documents in knowledge bases.

### Capacity Planning

Manage capacity investments on features, epics, and initiatives. Track capacity estimate values and capacity scenarios.

### Time Tracking

Log time tracking events against features, requirements, and initiatives. Supports remaining estimates and story points.

### Competitors & Personas

Create and manage competitor profiles and user personas within products.

### Custom Reports

Retrieve list and pivot views of saved custom reports.

### Integrations & Integration Fields

Manage integrations for products and accounts. Create and query integration fields that link Aha! records to external system records. Send records to configured integrations.

### Record Links

Create relationships between records (features, epics, goals, ideas, initiatives, releases, requirements, and notes).

### Account Backups

Create and download full account backups.

### Workflows

List and inspect configured workflows and their statuses.

## Events

Aha! supports three types of outbound webhooks that can be configured at either the account or workspace level.

### Activity Webhooks

The activity webhook provides real-time information about updates to Aha! records by sending a POST request to a specified URL every time a record is created, updated, or destroyed (with a five-minute delay).

- You can select which types of activity to send through the webhook.
- Activity webhooks do not send all data for a record when a field is updated. They only send over the fields that were updated.
- Check the box next to "Deliver immediately" to bypass the five minute delay.
- Can be configured at account or workspace level.

### Audit Webhooks

The audit webhook provides a live stream of events occurring within Aha! to a service that you create and run yourself. This allows custom logic to be implemented by your team to extend Aha!'s capabilities, or provide further auditing to meet regulatory concerns.

- The action will be one of create, update, or destroy.
- Each event includes metadata about the user or integration that performed the action.

### Security Webhooks (Enterprise+ only)

Security webhooks let you send security-related events from Aha! Roadmaps to a webhook so they can be processed by a SIEM system.

- Only available on Enterprise+ plans.
- Requires owner permissions or a custom user role to configure.
