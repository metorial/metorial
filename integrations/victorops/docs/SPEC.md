Now I have enough information to compile the specification. Let me look at the webhook event types more specifically from the data I've gathered.

From the search results, I can see the outgoing webhook event types include: Incident-Triggered, Incident-Acknowledged, Incident-Resolved, Any-Incident, as well as paging and on-call change events based on the payload examples.

# Slates Specification for VictorOps

## Overview

VictorOps (now Splunk On-Call) is an incident management platform for IT and DevOps teams that provides on-call scheduling, alert routing, incident lifecycle management, and team collaboration. It integrates with monitoring tools to receive alerts, create incidents, and page on-call responders based on configurable escalation policies.

## Authentication

VictorOps uses API key-based authentication for its REST API. To access the API, navigate to Integrations >> API in your VictorOps account. From there you can retrieve your API ID and create API Keys.

**Required credentials:**

- **API ID** (`X-VO-Api-Id`): A unique identifier for your organization. Generated automatically when API access is activated.
- **API Key** (`X-VO-Api-Key`): Only Splunk On-Call admin users can create API Keys. If you check the "Read-only" checkbox when creating an API key, the created key will only be able to perform GET requests.

Both the API ID and API Key must be passed as HTTP headers with every request:

- `X-VO-Api-Id: <your-api-id>`
- `X-VO-Api-Key: <your-api-key>`

The base URL for the API is `https://api.victorops.com`.

**Additional note:** VictorOps also has a separate **REST Alert Ingestion endpoint** for sending alerts/creating incidents, which uses a different URL and API key: The REST endpoint is different than the Splunk On-Call API and is the preferred method to create incidents. This endpoint URL follows the format `https://alert.victorops.com/integrations/generic/20131114/alert/<api-key>/<routing_key>`.

## Features

### Incident Management

Create, acknowledge, resolve, and reroute incidents programmatically. Incidents can be acknowledged or resolved individually or in bulk, and can be rerouted to different escalation policies or users. You can also acknowledge or resolve all incidents for a specific paged user.

### Alert Ingestion (REST Endpoint)

Send alerts into VictorOps via the REST endpoint to trigger, acknowledge, or recover incidents. While only message_type is required, additional fields like entity_id, entity_display_name, and state_message help establish the workflow and lifecycle of an incident. Supported message types include CRITICAL, WARNING, ACKNOWLEDGMENT, INFO, and RECOVERY. Alerts are routed to teams via routing keys embedded in the endpoint URL.

### On-Call Schedule Management

Get a user's on-call schedule or a team's on-call schedule. You can also create on-call overrides (take on-call) to temporarily replace the currently on-call user in an escalation policy.

### User Management

Add, update, retrieve, and remove users for an organization. Manage user contact methods (phone, email, SMS) and configure personal paging policies that determine how users are notified.

### Team Management

Create and manage teams, add or remove team members. When removing a user from a team, a replacement user must be specified. Teams serve as the organizational unit for escalation policies and rotations.

### Escalation Policies

Get, create, and delete escalation policies. Escalation policies determine who is on-call and define multi-step notification paths. They can reference rotation groups, individual users, or other policies.

### Routing Keys

List routing keys and associated teams, and create new routing keys with escalation policy mappings. Routing keys connect incoming alerts to the appropriate escalation policies and teams.

### Rotations

Get a list of all rotation groups for a team. Rotations define recurring on-call schedules within teams.

### Scheduled Overrides

List all the scheduled overrides for an organization. Overrides allow temporary on-call coverage changes on a per-escalation-policy basis.

### Maintenance Mode

Maintenance Mode allows you to temporarily mute alerts in order to complete server maintenance without disrupting members of your team with paging. Via the API, you can check the current maintenance mode state, start maintenance mode for specific or all routing keys, and end maintenance mode.

### Reporting

Get shift change history for a team and search incident history. Useful for generating post-incident reports and analyzing on-call workload.

### Chat and Notes

Send chat messages to the timeline, and create, update, or delete notes associated with specific incidents. Notes provide a way to annotate incidents with additional context.

## Events

VictorOps supports **outgoing webhooks** that fire when specific events occur. The Splunk On-Call Outgoing Webhooks are an Enterprise service level feature and require admin credentials to view and modify.

Outbound webhooks can subscribe to different Splunk On-Call actions such as incidents or chats. The webhook URL, method, content type, and payload are all configurable. Dynamic variables can be used as part of the payload.

### Incident Events

VictorOps has webhooks for incident triggered, incident acknowledged, and incident resolved. The available event types include:

- **Incident-Triggered**: Fires when a new incident is triggered.
- **Incident-Acknowledged**: Fires when an incident is acknowledged.
- **Incident-Resolved**: Fires when an incident is resolved.
- **Any-Incident**: Fires on any incident state change (triggered, acknowledged, or resolved).

Payloads can include dynamic variables such as alert count, current alert phase, entity ID, incident name, service, entity display name, message type, routing key, and more.

### Paging Events

Fires when a user is paged. Payload variables include the paged user, page start time, page ID, attempt number, notification method type and label, and cancellation status.

### On-Call Change Events

Fires when on-call status changes. Payload variables include the user, on-call state, team name, and rotation group ID.

### Escalation Webhooks

Webhooks can be added to your teams' escalation policies in order to receive incident details and process them however you wish. These are configured separately from outgoing webhooks and fire as part of an escalation policy step. When you create a webhook, a secure random authentication token is generated. POST requests are signed with this key so you can verify the incoming request.
