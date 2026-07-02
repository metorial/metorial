# Slates Specification for Gong

## Overview

Gong is a revenue intelligence platform that records, transcribes, and analyzes sales conversations (calls, video meetings, emails) to provide actionable insights. Its API is a RESTful interface that gives developers programmatic access to call recordings, transcripts, user statistics, and CRM data, as well as outreach automation flows. Gong offers two distinct APIs: the Standard API for extracting call data and building integrations, and the Engage API for managing outreach automation flows.

## Authentication

Gong supports two authentication methods:

### 1. API Key (Basic Auth)

Gong uses HTTP Basic Auth for their API, where the Access Key serves as the username and the Access Key Secret serves as the password.

- To obtain credentials, you must be a Gong technical administrator.
- Generate API keys by logging into Gong and going to **Company Settings → Ecosystem → API → API keys**.
- Use the Basic Authorization HTTP header: `Authorization: Basic <token>`, where the token is created by combining the Access Key and Access Key Secret with a colon and encoding in Base64: `Base64(<accessKey>:<accessKeySecret>)`.
- Store the secret securely immediately—you can't view it again after initial generation.
- Base URL: `https://api.gong.io`

### 2. OAuth 2.0

Gong's OAuth follows the standard OAuth 2.0 procedures as per RFC 6749.

- Gong doesn't support user-level OAuth. Authentication happens once on a global (organization) level.
- Use the Client ID and Client Secret obtained from Gong. This must be done by a tech admin.
- **Authorization URL**: `https://app.gong.io/oauth2/authorize`
- Parameters include `client_id`, `response_type=code`, `scope` (a space-delimited list of required scopes), `redirect_uri` (the callback endpoint), and `state`.
- The token response includes an `access_token`, `refresh_token`, `expires_in`, and an `api_base_url_for_customer` which is different for each customer and must be used as the base URL for all subsequent API calls.
- Access tokens expire periodically. Refresh the access token using the refresh token provided with your last access token.

**Scopes** are defined per API endpoint and must be selected when registering the integration. Examples include: `api:calls:read:basic`, `api:calls:create`, `api:library:read`, `api:users:read`, `api:flows:read`, `api:flows:write`, `api:stats:user-actions`, `api:stats:scorecards`, `api:crm:get-objects`, `api:crm:schema`, `api:crm:integrations:read`, `api:call-user-access:read`, `api:crm-calls:manual-association:read`, `api:meetings:user:delete`.

## Features

### Calls & Recordings

Retrieve analyzed call data from Gong, such as internal and external participants, topics, trackers, public comments, scorecards, and call transcripts. Calls can be filtered by date range or specific call IDs. Upload new or update call recordings to support cases where you have an internal system that records calls or obtains them from a third party.

### Transcripts

Retrieve full call transcripts for calls within a specified date range or by call IDs. Transcripts include speaker labels and timestamps, useful for NLP analysis, sentiment analysis, or feeding into data warehouses.

### Users & Activity Statistics

Retrieve all team members who used Gong and when. Retrieve aggregated activity statistics for multiple users over a specified date range, as well as daily activity breakdowns. Interaction stats include data such as talk ratio and longest monologue.

### Scorecards

Retrieve all the answers for scorecards that were reviewed during a specified date range, for specific scorecards, or for specific reviewed users. Scorecard configuration and details can also be retrieved.

### CRM Integration

Upload CRM data into Gong, including accounts, contacts, deals, leads, and users. Register and manage generic CRM integrations, retrieve CRM objects, and manage schema fields. List all calls that were manually associated with CRM account and deal/opportunity since a specified time.

### Engage Flows (Outreach Automation)

The Gong Engage API lets you manage and customize Engage flows at scale—list available flows and folders, assign or unassign prospects, and override flow content to tailor messaging for specific campaigns. You can assign up to 100 prospects to a flow in a single request.

### Library

Manage Gong's call library, including retrieving library folders and listing calls within specific folders.

### Digital Interactions & Engagement Events

Push digital interaction data into Gong, such as content share events and content viewed events, allowing external engagement data to appear in Gong's activity timeline.

### Meetings

Create and manage meetings in Gong programmatically, including validating meeting integration status and deleting meetings.

### Data Privacy

Delete users and all their associated elements. Retrieve or erase all references to a specific email address or phone number, supporting GDPR and privacy compliance.

### Workspaces & Permissions

List all company workspaces and retrieve permission profiles. List users attached to a given permission profile.

### Audit Logs

Retrieve log data by type and time range for auditing purposes.

### Trackers & Settings

Retrieve tracker configuration details (keywords and smart trackers used to identify topics in conversations) and other system settings.

## Events

Gong supports webhook-based event notifications through automation rules configured in the Gong UI.

### Call Events (Webhook Rules)

Create a rule defining which calls you want to be sent to another destination. When the rule is triggered, the call data is sent out of Gong to the specified URL.

- Rules are configured in the **Automation Rules** page within Gong's settings.
- The payload sent to the webhook when a rule is triggered is composed of call data and an isTest flag.
- The call data structure and element definitions are identical to the API.
- Webhook rules can be scoped to specific call criteria (e.g., tracker matches, call participants, or other conditions).
- Authentication for receiving webhooks can use signed JWT headers.
- These webhooks are primarily triggered when calls are processed and match the configured rule criteria (e.g., a call containing specific tracker keywords or involving certain participants).
