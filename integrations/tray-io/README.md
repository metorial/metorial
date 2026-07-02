# <img src="https://provider-logos.metorial-cdn.com/tray-io.png" height="20"> Tray Io

Automate workflows and integrate across hundreds of third-party services using pre-built connectors. Execute connector operations to call external service APIs (e.g., Salesforce, Slack, Trello) with dynamic input/output schemas. Create, manage, and delete service authentications including OAuth2 flows. Manage external end users, generate user tokens, and perform actions on their behalf. List, create, enable, disable, and delete solution instances for embedded integrations. Export and import projects and workflows for promotion across environments. Expose workflows as REST API endpoints with configurable access control, roles, and throttling policies. Receive real-time events via webhook triggers, scheduled triggers, callable triggers, email triggers, and service-specific event subscriptions. Retrieve dynamic dropdown data (DDL) from connected services for building configuration forms.

## Tools

### Call Connector

Execute an operation on a Tray.io connector. This calls the specified third-party service operation (e.g., send an SMS via Twilio, find records in Salesforce) using the REST Call Connector API. Requires a valid authentication ID for the target service.

### Get Connector Operations

Retrieve the available operations and their input/output schemas for a specific connector. Use this to discover what operations a connector supports and what parameters are required before calling it. Also returns service environments needed for authentication setup.

### List Connectors

List all available Tray.io connectors. Each connector represents a third-party service integration (e.g., Salesforce, Slack, Twilio). Returns connector names, versions, and descriptions needed for calling connector operations.

### List Solutions

List all available solutions in the Tray.io workspace. Solutions are configurable project templates that end users can instantiate. Requires a master token.

### List Authentications

List all service authentications for the authenticated user. Each authentication represents stored credentials for a third-party service connector (e.g., Salesforce, Slack). Returns authentication IDs needed for calling connectors and configuring solution instances.

### List Solution Instances

List all solution instances for the authenticated user. Solution instances are end-user deployments of a solution with their specific configuration and authentication values. Requires a user token.

### List Users

List external end users managed through the Tray.io Embedded API. Optionally filter by external user ID.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
