# <img src="https://provider-logos.metorial-cdn.com/ifttt.png" height="20"> Ifttt

Automate workflows by connecting 900+ services through conditional Applets composed of triggers, queries, and actions. Manage connections between services on behalf of users, subscribe to trigger events from connected services, execute actions programmatically, and retrieve data via queries. Send and receive arbitrary HTTP requests through the Webhooks service to integrate with any public API. Notify IFTTT of real-time changes via the Realtime API for near-instant Applet execution. Handle connection lifecycle events (enabled/disabled) and trigger event webhooks. Run JavaScript runtime scripts to process trigger events without a dedicated backend.

## Tools

### Fire Webhook

Trigger an IFTTT webhook event via the Maker Webhooks service. This fires the "Receive a web request" trigger, which can activate any Applet connected to it. Supports passing up to 3 simple string values, or a full JSON payload for the JSON trigger variant.

### Get Connection

Retrieve the details and current status of an IFTTT connection. Returns the connection's configuration including its triggers, actions, queries, and the user's field settings if a user ID is provided.

### Get Field Options

Retrieve the available options for a dynamic field in a trigger, action, or query. Useful for discovering valid values before running an action, performing a query, or configuring a trigger. Returns a list of label-value pairs (may include nested categories).

### Perform Query

Execute a query on a connected IFTTT service to retrieve data. Queries let you fetch additional data from connected services, such as retrieving device states, listing items, or getting current values. Supports pagination with cursor-based navigation.

### Run Action

Execute an action on a connected IFTTT service for a specific user. Actions are the output side of Applets, such as creating calendar events, sending messages, controlling smart home devices, posting to social media, etc. The available action fields depend on the connected service's action definition.

### Send Realtime Notification

Notify IFTTT's Realtime API that new trigger events are available. This causes IFTTT to immediately poll your trigger endpoints for the specified users or trigger identities, enabling near-instant Applet runs instead of waiting for the normal ~1 hour polling cycle.

### Test Trigger

Simulate a trigger event for a specific connection and user. This sends a test request that simulates an event firing for the user, which IFTTT will then forward to your webhook endpoint. Useful for testing and debugging connection integrations.

### Update Connection

Update a user's IFTTT connection configuration. This replaces the current stored configuration for the user, including trigger fields, action fields, and query fields. Use **Get Connection** first to see current settings.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
