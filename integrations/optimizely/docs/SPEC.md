Now let me get more details on the CMP webhook events and the ODP/Campaign API capabilities:Now I have enough information to write the specification. Let me compile all the research:

# Slates Specification for Optimizely

## Overview

Optimizely is a digital experience platform offering multiple products: Web Experimentation and Feature Experimentation (A/B testing and feature flags), Content Marketing Platform (CMP) for content workflow and asset management, Campaign for email marketing, CMS (SaaS) for content management, Optimizely Data Platform (ODP) for customer data, and Optimizely Graph for content querying. Each product has its own API surface, authentication mechanisms, and webhook capabilities.

## Authentication

Optimizely's products use different authentication methods depending on the specific product being accessed:

### Experimentation APIs (Web Experimentation & Feature Experimentation)

**Base URL:** `https://api.optimizely.com/v2`

Two authentication methods are supported:

1. **Personal Access Tokens (PAT):** Generate your personal access token from the Optimizely application by navigating to Profile > API Access > Generate New Token. If you are an Administrator in your account, you can generate a token for yourself that will not expire until you revoke the token. Use the token in the `Authorization: Bearer {token}` header.

2. **OAuth 2.0:** Optimizely Web Experimentation provides the OAuth 2.0 protocol to let you authorize third-party applications to access Optimizely Web Experimentation data with the REST API. Register your application under Account Settings > Registered Apps, providing an Application Name, Redirect URI, and Client Type (Public or Confidential). The standard authorization code flow is used to obtain access tokens.

### Content Marketing Platform (CMP)

**Base URL:** `https://api.cmp.optimizely.com`

Optimizely CMP supports the client credentials flow, an OAuth 2.0 flow designed for machine-to-machine authentication that enables your application to securely access resources on behalf of itself, rather than on behalf of a user.

To set up: Go to Admin menu > Apps and Webhooks. Under the Apps tab, click Register App. When your registration is successful, Optimizely CMP sends you a client_id and a client_secret which you use to request access tokens. An authorization code flow is also available for user-context access, with refresh token support.

### CMS (SaaS)

**Base URL:** `https://api.cms.optimizely.com`

To use CMS (SaaS) REST API, you must authenticate calls with a bearer JSON Web Token (JWT) by requesting a JWT from the token endpoint with the OAuth 2.0 protocol. Create an API key under Settings > API Keys in your CMS instance to obtain a Client ID and Client Secret. Then request a token via:

```
POST https://api.cms.optimizely.com/oauth/token
grant_type=client_credentials&client_id={ID}&client_secret={SECRET}
```

The token is valid for 300 seconds (five minutes). An optional `act_as` parameter allows impersonating a specific user.

### Optimizely Data Platform (ODP)

To use your API key, include it in the headers of your REST API request. API keys are obtained from the ODP dashboard.

### Campaign

The API overview provides access to specific data like URLs, IDs and authorization codes required when integrating Optimizely Campaign using for example REST and SOAP APIs. Uses Basic HTTP authentication with credentials found under Administration > API Overview > REST API in the Campaign interface.

## Features

### Web Experimentation Management

You can use Optimizely Web Experimentation API to access resources in your Optimizely Web Experimentation projects. This API closely mirrors the functionality of the Optimizely Web Experimentation user interface. Allows creating and managing A/B test experiments, projects, audiences, custom events, and variations programmatically. Includes access to experiment results data via the Stats Engine.

- The REST API supports both Optimizely Web Experimentation and Optimizely Feature Experimentation. Both products share many of the same data models, so endpoints like Experiments and Projects can be used for both.

### Feature Experimentation Management

The Optimizely API lets you create and manage Feature Experimentation projects, audiences, and environments. Allows managing feature flags, rollouts, experiments, environments, and audiences. Supports configuring flag rulesets including A/B tests with traffic allocation per variation.

- The Flags API (`https://api.optimizely.com/flags/v1`) provides flag-specific operations like managing rulesets and enabling/disabling flags per environment.

### Content Marketing Platform (CMP)

You can use the REST API and webhooks to achieve some of the following examples: The Asset API can sync supported assets with the following: The CMP library with an Optimizely Digital Asset Manager (DAM). Asset metadata between two systems. A Sales Enablement or Marketing Automation platform, including the metadata needed to sort, organize, and target those assets to specialized audiences in those systems. The Asset API can send approved images from the CMP library to a specific folder in an image repository.

Key capabilities include:

- **Asset & Library Management:** Upload, manage, and organize assets (images, videos, articles, raw files, structured content) in folders with permissions.
- **Task & Workflow Management:** Create and manage tasks, workflow steps/substeps, comments, briefs, and custom fields. Track task progress through workflow stages.
- **Campaign Management:** Create and manage marketing campaigns with briefs, comments, attachments, and custom fields.
- **Work Requests:** Submit and manage work requests including comments, attachments, and approval workflows.
- **Publishing:** Manage publishing events and associated metadata for content distribution.
- **Structured Content:** Define and manage content types, content versions, and content migrations.
- **Users & Teams:** List and retrieve user and team information.

### CMS (SaaS) Content Management

Manage content items, content types, and site definitions programmatically. Supports CRUD operations on content and content type definitions. Includes content delivery APIs for headless content retrieval.

### Optimizely Campaign (Email Marketing)

Integrate Optimizely Campaign features into your software or manage and control them remotely by using HTTP requests. You can retrieve data from and send data to Optimizely Campaign via REST API. You can execute virtually any function of Optimizely Campaign from a remote system.

Includes managing mailings, recipient lists, target groups, opt-in processes, assets, attachments, and Smart Campaigns.

### Optimizely Data Platform (ODP)

Integrate and manage customer data including customer profiles, events, segments, and audiences. Send and query customer events, manage identifiers, and access real-time segmentation data.

### Experimentation Events Export

The simplest and fastest way to access your Experimentation Events Export is by using the Optimizely Authentication API, where you can exchange an Optimizely Experimentation-issued token for temporary AWS credentials. These credentials can then be used to access the Experimentation Events S3 buckets associated with your account. Provides access to raw experiment decision and conversion event data.

### Optimizely Graph

A content query API that provides a GraphQL interface for querying indexed content from CMS. Supports filtering, sorting, and faceting of content. Webhooks notify when content is synchronized or expired.

## Events

Optimizely supports webhooks across several of its products:

### Feature Experimentation Webhooks

Webhooks in Optimizely Feature Experimentation can notify your server when certain events occur. This lets you send relevant and actionable user activity notifications to any external system. Using a webhook also lets you notify your server when the datafile updates, eliminating the need to constantly poll and determine if there are changes in the Feature Experimentation configuration.

- **Datafile Updated (`project.datafile_updated`):** Triggered when the project datafile is updated due to changes in feature flags, experiments, or other configuration. Includes the environment name, revision number, and datafile URLs.
- You can subscribe to notifications for any event captured in the Feature Experimentation change history.
- Webhooks are secured using a secret token with an `X-Hub-Signature` header for verification.

### Content Marketing Platform (CMP) Webhooks

Webhooks let you subscribe to events on the Optimizely Content Marketing Platform (CMP) to get programmatical notifications. When one of those events happens, Optimizely sends an HTTP POST payload with a JSON body to the configured callback URL.

Webhook event categories include:

- **Task Events:** Task asset added/removed/modified, draft added/removed, workflow substep updates (started, completed, skipped, assignee/due date changes), content preview requested.
- **Campaign Events:** Notifications related to CMP campaign changes.
- **Library Events:** Notifications about asset changes in the CMP library.
- **Publishing Events:** Notifications when content publishing actions occur.
- **Work Request Events:** Notifications about work request changes.
- **Event (Calendar) Events:** Calendar events created or modified.
- **External Work Management Events:** Updates related to external work integrations.

Configuration: Provide a callback URL (HTTPS required), select event names, and optionally supply a secret string (up to 32 characters) for verification via the `Callback-Secret` header. Register webhooks under Admin > Apps and Webhooks.

### Optimizely Campaign (Email) Webhooks

This topic describes how to use webhooks to receive real-time event data on sent mailings, opens, clicks, bounces, unsubscribes, and spam complaints.

Event types include:

- **Sent:** Mailing was sent to a recipient.
- **Open:** Recipient opened a mailing.
- **Click:** Recipient clicked a link in a mailing.
- **Bounce:** Message could not be delivered (soft bounce or hard bounce).
- **Unsubscribe:** Recipient unsubscribed.
- **Spam Complaint:** Recipient reported the mailing as spam.

To enable this feature, contact customer support. Webhooks are managed via the Campaign REST API and must be created, verified, and then activated before they begin delivering events.

### Optimizely Graph Webhooks

Optimizely Graph can notify your applications when content changes, enabling workflows such as static site generation (for example, Gatsby) to stay up to date.

Event types use a subject/action model:

- **`doc.updated`:** A single content item was updated.
- **`doc.expired`:** A content item has expired.
- **`bulk.completed`:** A bulk content synchronization job chunk has finished processing.

Filters events by subject and action. Use an asterisk (\*) as a wildcard. You can also apply content filters (e.g., by status or custom fields) to receive only specific notifications.
