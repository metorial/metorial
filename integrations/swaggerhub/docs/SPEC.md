# SwaggerHub integration

## Authentication and configuration

Use a personal SwaggerHub API key, sent directly as `Authorization: YOUR_API_KEY` to the Registry API. No OAuth scopes or token refresh are needed. The default Registry API URL is `https://api.swaggerhub.com`; an on-premise installation commonly uses `https://your-host/v1`. A default owner username or organization name is optional; resource tools accept an owner override.

The SaaS Registry API 1.4.0 is documented at [Registry API](https://api.swaggerhub.com/apis/swagger-hub/registry-api/1.4.0/swagger.json). On-premise users should consult the API definition bundled with their installed version.

## Supported workflows

- Search APIs and domains with pagination, visibility, publication state, owner, and text filters. Search properties retain values including owner, name, version, and publication state.
- Inspect definitions in JSON or YAML and list available API/domain versions. Existing definition output values remain available. API inspection forwards reference resolution and schema flattening for both formats.
- Download an API or domain definition as a YAML or JSON file with `download_definition`.
- Create/update definitions, delete definitions or versions, and update API default version, publication state, visibility, or name.
- Create a new API/domain version from an existing version with `clone_definition_version`.
- Read comments and replies, including provider IDs and authors.
- List, inspect, create, update, delete, and execute configured API integrations. List responses expose the provider ID and the integrationId alias used by subsequent actions. Integration updates retrieve sanitized configuration from the provider rather than return submitted credentials.
- List, inspect, create, update, delete, and add definitions to projects. Project IDs are project names; list projects to discover them. Supplied API/domain lists replace the corresponding list, while omitted fields are preserved during updates. The read/modify/write update is not atomic with concurrent provider edits.
- Retrieve standardization results under the existing run_standardization key. This reads the provider's results; it does not start an asynchronous scan.
- Retrieve API collaboration settings using the existing collaboration operation. This legacy route is retained for compatibility; it is not present in the current SaaS Registry API definition and was not live verified.

Projects and standardization require eligible organization plans. Integration types, permissions, and Registry API availability may vary by installation. This package does not provide SDK generation, organization membership administration, or webhook registration.
