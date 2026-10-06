# UptimeRobot

Monitor website and service availability, investigate downtime incidents, and manage monitoring settings.

## Connections

Create an account-level credential under **Integrations & API** in your UptimeRobot dashboard. Read-only credentials support reads; changes require a credential with write access. Monitor-specific keys do not support account identity discovery.

- **Current API Token** uses API v3 and Bearer authentication. Choose it for **Who Am I**, **List Current Monitors**, **Get Monitor**, **Manage Monitor**, and **List Incidents**.
- **Legacy API Key** uses API v2. Choose it for alert contacts, status pages, maintenance windows, account details, and the existing **List Monitors**, **Create Monitor**, **Update Monitor**, and **Delete Monitor** tools.

The provider keeps v2 available but directs new workflows to v3. A credential connection selects one API version; use separate connections when a workflow needs both sets of tools.

## Monitoring

Current monitor tools support HTTP, keyword, ping, port, heartbeat and DNS monitoring. Create and update enforce settings appropriate to the monitor type. Creating a current monitor assigns no alert contacts unless you explicitly supply them. Updating assignments to an empty array clears them. Plan limits determine intervals and available features.

Returned monitor information excludes API keys, heartbeat ping URLs, HTTP authentication credentials, private headers and request bodies. Returned HTTP URLs omit credentials and query parameters. Configure or retrieve a heartbeat ping URL in the provider dashboard.

List tools expose pagination. Continue legacy lists with `offset` and `limit`; continue current monitor and incident lists with `nextCursor`, preserving the filters. Incidents are read-only; deleting a monitor permanently removes its history.

Status-page creation requires selected monitor IDs, or an explicit choice to include every monitor. Contact creation may send an activation notification. The retained legacy SMS contact choice returns an unsupported-operation error because SMS contact creation is deprecated. Maintenance windows require a supported paid plan.

## API documentation

- [Current API](https://uptimerobot.com/api/v3/)
- [Official OpenAPI specification](https://cdn.uptimerobot.com/api/openapi.yaml)
- [Legacy API](https://uptimerobot.com/api/legacy/)
