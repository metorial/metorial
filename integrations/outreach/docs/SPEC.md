Let me get more details on the webhook resources and scopes available.Now I have comprehensive information. Let me also check what the S2S authentication details look like and get the full scope list.Now I have all the information needed. Let me compile the specification.

# Slates Specification for Outreach

## Overview

Outreach is a sales engagement platform that helps sales teams manage prospects, accounts, sequences (automated multi-step outreach campaigns), emails, calls, tasks, and opportunities. It provides a REST API based on the JSON API 1.0 specification for programmatic access to its sales engagement data and automation capabilities.

## Authentication

Outreach supports two authentication methods:

### 1. OAuth 2.0 (Primary Method)

Outreach currently enables access to the REST API via API calls authenticated via OAuth 2.0 protocol. This is the standard Authorization Code flow.

**Setup:**

- To begin using the REST API you need to create an Outreach app. Then go to the API access tab to configure access specifics. You'll need to specify one or more redirect URIs and select the OAuth data scopes that your application intends to use.
- For each Outreach app, the development and production credentials are generated. Development credentials are provisioned immediately and are intended to be used during application development and testing.
- Production credentials are provisioned after the app goes through the publishing process and eventually a review.

**Flow:**

1. **Authorization:** Redirect the user to:

   ```
   https://api.outreach.io/oauth/authorize?client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&response_type=code&scope=<SCOPES>&state=<STATE>
   ```

   Scope must be a space-separated list of permitted API scopes, and both redirect_uri and scope must be properly URL-encoded.

2. **Token Exchange:** After user authorization, exchange the authorization code for tokens:

   ```
   POST https://api.outreach.io/oauth/token
   ```

   Parameters: `client_id`, `client_secret`, `redirect_uri`, `grant_type=authorization_code`, `code=<AUTH_CODE>`

3. **Using the Token:** Include the access token in the `Authorization: Bearer <ACCESS_TOKEN>` header.

4. **Refreshing:** Continue to re-use your access token until it expires (2 hours). Refresh tokens remain active for 14 days. Use `grant_type=refresh_token` at the same token endpoint. A new refresh token is issued with each new access token.

**Scopes:** Scopes follow the pattern `<resource>.<permission>` where permission is one of `all`, `read`, `write`, or `delete`. Resources include: `accounts`, `auditLogs`, `calls`, `callDispositions`, `callPurposes`, `complianceRequests`, `contentCategories`, `contentCategoryMemberships`, `contentCategoryOwnerships`, `customDuties`, `duties`, `events`, `favorites`, `mailings`, `mailboxes`, `opportunities`, `personas`, `prospects`, `roles`, `sequences`, `sequenceStates`, `sequenceSteps`, `snippets`, `stages`, `tasks`, `teams`, `templates`, `users`, `webhooks`, and others.

### 2. Server-to-Server (S2S) Authentication

Additionally a limited set of API endpoints is available with an authentication token you can obtain through a proprietary S2S protocol.

**Setup:**

- Add the "API Access (S2S)" feature for your app in the Outreach Developer portal and select one or more API scopes. S2S API scopes are a subset of OAuth API scopes. Then add one or more public keys in PEM-encoded format.

**Flow:**

1. Generate an RSA key pair and register the public key in the Outreach developer portal.
2. Create a JWT app token signed with your private key, using the `S2S_GUID` as the issuer.
3. Obtain an installation ID (via setup token exchange or lifecycle webhook when your app is installed).
4. Call `POST https://api.outreach.io/api/app/installs/INSTALL_ID/actions/accessToken` with your app token. The response contains the S2S token. The S2S token remains valid for one hour. There is no token refresh method; you simply request a new S2S token.

**Available S2S scopes are limited to:** accounts, auditLogs, calls, events, mailings, opportunities, prospects, sequences, sequenceStates, snippets, tasks, templates, users, and webhooks.

## Features

### Prospect and Account Management

Manage the core sales data objects: prospects (contacts/leads) and accounts (companies). Create, update, delete, and query prospects and accounts. Prospects can be associated with accounts. Supports custom fields on both resources.

- Prospects include engagement statistics such as email open/reply counts.

### Sequences and Automation

Sequences are at the heart of Outreach's system of engagement. The API provides the ability to create and manage sequences and their related rulesets and sequence steps. Sequences can be interval-based (steps separated by days) or date-based (steps at specific dates).

- Prospects can be added and removed from sequences at any time. The Outreach API encapsulates the concept of a prospect within a sequence as a sequence state resource.
- Sequence states track the progress and status of a prospect through a sequence.

### Emails and Mailings

Send and track emails through the platform. Mailings represent sent emails and include tracking data for bounces, deliveries, opens, and replies. Manage mailboxes and mail aliases.

### Calls

Log, create, and manage phone calls. Supports call dispositions (outcomes) and call purposes (reasons for calling).

### Tasks

Outreach can automatically assign users tasks when certain events occur to help streamline their workflow. The API can help identify new tasks and provide the opportunity to take the necessary action. Tasks can be filtered by state (e.g., incomplete) and type (action_item, call, email, in_person).

### Opportunities

Manage sales opportunities with stages, prospect roles, and related pipeline data.

### Templates and Snippets

Access and manage email templates and reusable text snippets for use in sequences and one-off emails.

### User Management

You can invite new users to the Outreach platform and manage their identities using the Outreach API. Manage user profiles, roles, and teams.

### Custom Objects

Custom Objects are a way to store custom data in Outreach. You can use Custom Objects to store data that is not natively supported by Outreach, such as product information, customer data, or any other custom data. They are configurable in the Outreach Application. The public API allows you to list, get, create, update and delete custom object records.

### Bulk Operations and Imports

The API supports bulk operations for creating and updating records in batch, as well as managing data imports.

### Kaia (Conversation Intelligence)

Access Kaia meeting recordings and voice imports for conversation intelligence data.

### Compliance Requests

Submit and manage data compliance requests (e.g., GDPR-related data deletion).

### Audit Logs

Read audit log entries for tracking changes and user activity within the Outreach organization.

### Data Sharing

Outreach offers data sharing via Snowflake and Delta Sharing for large-scale data access outside of the REST API.

## Events

Outreach supports webhooks for real-time event notifications. The Outreach API normally requires your action to retrieve, create or update resources. But with webhooks, the Outreach API will automatically notify you whenever events that you are interested in occur.

Webhooks are created as API resources, specifying a target HTTPS URL, a resource type, and an action to listen for. Both resource and action default to `*` (wildcard) if not specified. An optional `secret` can be provided for HMAC-SHA256 signature verification via the `Outreach-Webhook-Signature` header. A `payloadVersion` of `2` can be set to receive before-update attribute values.

### Supported Resource-Action Combinations

- **Account:** created, updated, destroyed
- **Call:** created, updated, destroyed
- **Email Address:** created, updated, destroyed
- **Import:** created, finished
- **Kaia Recording:** created
- **Mailing:** created, updated, destroyed, bounced, delivered, opened, replied
- **Opportunity:** created, updated, destroyed
- **Opportunity Prospect Role:** created, updated, destroyed
- **Prospect:** created, updated, destroyed
- **Sequence:** created, updated, destroyed
- **Sequence State:** created, updated, destroyed, advanced, finished
- **Task:** created, updated, destroyed, completed
- **User:** created, updated

### Application Lifecycle Webhooks

Outreach allows for registering a webhook URL for getting notifications about lifecycle events of your application. To configure webhooks add the "Application lifecycle webhooks" feature to your app and specify the URL which is going to be called. Events include `install.created` (app installed) and `install.deleted` (app uninstalled).
