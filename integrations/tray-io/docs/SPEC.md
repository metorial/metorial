Now let me look at the OpenAPI/developer API more specifically to understand what the Tray.io API exposes programmatically:Now I have enough information to write the specification. Let me also check what the Tray.io Connectivity APIs (non-embedded) offer specifically:Now I have comprehensive information to write the specification. Tray.io offers two main API sets: the Connectivity APIs (REST-based) and the Embedded APIs (GraphQL-based). Let me compile the specification.

# Slates Specification for Tray.io

## Overview

Tray.io (now Tray.ai) is an integration platform as a service (iPaaS) that provides workflow automation across hundreds of third-party services via pre-built connectors. It offers two primary API surfaces: Connectivity APIs (REST) for directly calling connector operations and managing authentications, and Embedded APIs (GraphQL) for programmatically managing users, solutions, solution instances, and projects on behalf of end users. The platform supports building, deploying, and managing integrations, automations, and APIs.

## Authentication

Tray.io uses **Bearer token authentication** for all API calls. There are two types of tokens:

- **Master Token**: Obtained from the Tray Embedded/Partner Dashboard UI. Every query must be authenticated using an Authorization header which includes your master API token (obtained from the Partner Dashboard). Used for administrative operations such as managing users, listing solutions, and importing/exporting projects.

- **User Token**: A user token is obtained with the Create User Token mutation (required for calls such as 'Get Solution Instances'). Used for actions performed on behalf of a specific end user, such as creating authentications, calling connectors, and managing solution instances.

Credentials are passed in the HTTP headers as: `Authorization: Bearer <your-token>`. Depending on the call being made, your bearer will either be a master token or a user token.

**API Endpoints** (region-specific):

- US (default): `https://tray.io/graphql` (Embedded/GraphQL API)
- EU: `https://eu1.tray.io/graphql`
- APAC: `https://ap1.tray.io/graphql`

The Connectivity APIs use REST endpoints documented at `https://developer.tray.ai/openapi/trayapi-introduction/`.

All endpoints require a bearer token. For all the endpoints you can either use a user token. If you are using a Master token, you are taking actions (e.g., getting connectors, getting operations schemas). When you use a user token, it's your end users who are performing the actions (e.g., creating an auth, calling a connector).

**User token generation flow**: Use the master token to create an external user, then call the `authorize` mutation with the user's ID to receive an `accessToken` (user token).

## Features

### Connector Operations (Call Connector)

Connectors expose the API operations of third-party services. If you were building an integration between Salesforce and Slack, you would need both Salesforce and Slack connectors, using the relevant operations on both to build the integration. The API allows you to:

- **List available connectors** and their versions.
- **Retrieve operation schemas** (input/output) for any connector operation, which can be used to build dynamic forms or validate data.
- **Execute connector operations** by calling a specific operation on a connector with the required inputs and an authentication ID.
- Returns a list with all the available operations for a given connector. Each connector operation has an input and output schema that can be used by a frontend to build a form or validate data.
- Supports DDL (dynamic data lookup) operations for populating dropdowns with live data from services (e.g., listing Trello boards to let a user pick one).

### Authentication Management

Allows programmatic creation, retrieval, updating, and deletion of service authentications. Enables creation of user authentications in Tray. This endpoint is for the import of existing authentications.

- Create authentications for token-based and OAuth2-based services by providing `serviceId`, `serviceEnvironmentId`, and credential data.
- Retrieve authentication metadata (ID, name, scopes) or full sensitive data (tokens/keys).
- Retrieve service environments for a given connector (e.g., to identify custom OAuth apps).
- Supports white-labelled OAuth authentication flows via custom OAuth apps and configurable redirect URLs.

### User Management (Embedded API)

Manage external end users who interact with your embedded integrations:

- Create and delete external users linked to your organization.
- Generate user access tokens for performing operations on behalf of specific users.
- List and filter users by ID or external user ID.

### Solution and Solution Instance Management (Embedded API)

A Solution makes a Project configurable for an End User (via the Config Wizard) by pulling all of the Config Data and Authentications contained in your project and making them available as Config Slots and Authentication Slots. These are populated with Config and Authentication values when the End User runs the Config Wizard, to create their own Solution Instances.

- List available solutions.
- Create, enable, disable, and delete solution instances for end users.
- Update solution instances when new versions are published.
- Retrieve configuration and authentication values for each instance.
- Retrieve webhook/trigger URLs for workflow instances within a solution instance.

### Project and Workflow Management (Embedded API)

Projects are used to group workflows which work together to achieve a particular purpose. Via callable workflows, they can also be used as callable 'functions' (e.g., repeatable data processing tasks) which other projects in the same workspace can make use of. All workflows in Tray must be added to a project.

- Export and import projects (useful for promoting from staging to production).
- Import and export individual workflows.

### API Management

Tray.io announced AI-augmented API Management, a capability that turns any new or existing workflow into a reusable API.

- Expose workflows as REST API endpoints with configurable HTTP methods and URI paths.
- Define access control policies with clients (API tokens), roles, and granular policies.
- Access control can define Clients, Roles and Policies. Policies can specify granularly which Operations are affected, what should match in terms of HTTP headers, authentication, Roles, JSON fields, etc. It is even possible to set up request throttling based on timeframes.

## Events

Tray.io supports receiving real-time events via **Webhook Triggers**. The Webhook Trigger is designed to allow users to catch callouts for any service that has the option of sending a signal to a custom URL.

### Webhook Trigger

Each workflow can be configured with a Webhook Trigger that provides a unique public URL. External services send HTTP POST requests to this URL to trigger the workflow.

- The webhook URL is generated per workflow and can be retrieved via the API (from solution instance workflow data).
- Supports optional CSRF token validation via the `X-CSRF-TOKEN` header for security.
- Can receive any JSON payload from any external service.

### Service-Specific Triggers

Tray has hundreds of pre-built service triggers (e.g., a Calendly trigger which is activated every time a Calendly event is created or cancelled). These are connector-specific triggers that subscribe to events from specific services (e.g., Salesforce record changes, Typeform responses, Slack messages). The available events vary by connector and are documented on each connector's individual page.

### Additional Trigger Types

- **Scheduled Trigger**: Run workflows on a defined schedule (cron-like).
- **Callable Trigger**: Invoke a workflow from another workflow.
- **Alert Triggers**: Listen for errors in other workflows (Alerting Trigger, Solution Alert Trigger).
- **Form Trigger**: Trigger workflows from form submissions.
- **Email Trigger**: Trigger workflows from incoming emails.
