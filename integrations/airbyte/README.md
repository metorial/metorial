# Airbyte

Manage Airbyte data replication through its public API: discover workspaces, organizations and connector definitions; provision and manage sources/destinations; configure connections, namespaces, streams and selected fields; start sync/reset jobs; inspect and cancel jobs; manage tags and scoped permissions.

Connect with an Airbyte application client ID and secret. Cloud uses `https://api.airbyte.com/v1`; self-managed uses `<YOUR_AIRBYTE_URL>/api/public/v1`. Access-token expiration follows the returned `expires_in`, and renewal exchanges the application credentials again. Application permissions match the associated user. The self-managed Configuration API and Airbyte agent/context products are separate interfaces.

There are 35 tools. All 31 original keys remain; `get_workspace`, `list_organizations`, `list_source_definitions` and `list_destination_definitions` add discovery/readback. Call `list_workspaces` first to choose an authorized workspace. For built-in connector creation, pass `sourceType` or `destinationType` and connector configuration. For custom definitions, pass the discovered `definitionId` instead. Configuration results retain top-level keys and redact every value, including custom fields; do not copy redacted results into new connector configurations.

Connection stream updates replace the configured stream set. Supply every desired stream, use namespaces to distinguish duplicate names, and optionally select specific fields. Empty updates and incompatible schedule/permission branches fail clearly. A reset may clear destination data; syncs, connector validation and provisioning can consume resources. Cancellation is a request whose completion should be checked with `get_job`. Only `failed`, `succeeded` and `cancelled` are terminal; `incomplete` can retry.

Workspace and organization permissions depend on the deployment edition and user role. The public API does not grant `instance_admin`. Existing deployments may support different connector catalogs or features. No embedded-template, connector-OAuth authorization or notification-receiver tools are included.
