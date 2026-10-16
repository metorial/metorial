# Faraday

Manage Faraday Enterprise predictive AI pipelines: inspect datasets and data connections, define customer cohorts, configure propensity outcomes and persona sets, and deploy predictions through scopes and targets. Look up predictions using individual identifiers or alternate identity sets, inspect model analysis and resource dependencies, preview deployments, and download target CSV exports.

## Authentication

Connect with an API key from the Faraday dashboard Settings page. `get_account` identifies the account associated with the key. The integration uses the Enterprise REST API at `https://api.faraday.ai/v1`.

## Workflow notes

- Discover resource UUIDs with the corresponding list tools before acting.
- Cohort conditions support a single legacy condition object or the corresponding optional condition list. Supply the event stream name for stream-based cohorts.
- Set `preview` explicitly when creating a scope. `true` requests a limited unbilled preview; `false` creates a full scope. An empty population cohort list includes the US population.
- `personaCount` maps to the provider's integer `number_of_clusters` setting; omit it for automatic cluster selection.
- Lookup prediction values may be null when an identity matches but a model cannot score it. The complete response is retained.
- Recommender availability depends on Faraday's experimental account feature. Forecasts are documented as coming soon and are not exposed here.
- Downloads use the provider's authenticated CSV endpoint. Availability depends on the target having generated output.

[API reference](https://faraday.ai/docs/reference) · [Lookup API](https://faraday.ai/docs/features/lookup-api)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
