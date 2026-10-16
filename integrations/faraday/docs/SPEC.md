# Faraday integration specification

This integration covers Faraday Enterprise's account-scoped v1 REST API. Cohorts, outcomes, persona sets, scopes, targets, datasets, connections, streams, traits, and the dependency graph are resources of one API, so the integration does not split tools into product categories. Faraday Pro is a separate offering and is not included.

API keys authenticate all requests through the Bearer Authorization header. The current-account endpoint provides connection identity; no OAuth token exchange, refresh, scopes, or global resource ID configuration is required.

The tool surface includes resource discovery and inspection; cohort creation and editing; outcome and persona creation and editing; scope and deployment configuration; dependency inspection; prediction lookup; model analysis; deployment preview and CSV download; and cleanup of supported resources. Provider metadata is retained alongside established mapped fields. Current-account metadata excludes the API key.

Existing public tool keys and field types remain supported. Legacy cohort condition objects are sent as single-element arrays, and optional condition-list inputs support multiple predicates without changing those objects. Persona cluster counts use `number_of_clusters`. New update operations use JSON Merge Patch, preserve explicit null clearing where exposed, and reject empty changes. Scope creation requires an explicit runtime preview choice because the provider request schema requires it and declares no default.

No webhook registration or event triggers are implemented. Recommender mutation is omitted because the documented feature is experimental. Forecasts are coming soon in current product documentation.

Authoritative contracts: [REST API](https://faraday.ai/docs/reference), [OpenAPI document](https://faraday.ai/api.json), [Lookup API](https://faraday.ai/docs/features/lookup-api), and [key abstractions](https://faraday.ai/docs/abstractions).
