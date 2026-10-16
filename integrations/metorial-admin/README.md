# <img src="logo.svg" height="20"> Metorial Admin

Metorial Admin exposes a controlled dynamic wrapper around Metorial dashboard instance API endpoints. It lists callable endpoints from Metorial introspection, lists instances available to the authenticated actor, reads authenticated account context and instance details, and calls validated dashboard instance endpoints with Metorial OAuth or API key authentication.

## Tools

### List Endpoints

List callable Metorial dashboard instance API endpoints from runtime introspection. Hidden, deprecated, confidential, and non-instance endpoints are excluded.

### List Instances

List Metorial instances visible to the authenticated actor without sending a `metorial-instance-id` header.

### Call Endpoint

Call a Metorial dashboard instance API endpoint that appears in List Endpoints. The endpoint is revalidated against current introspection before dispatch. JSON responses are returned inline, empty responses return status metadata, and non-JSON responses are prepared as downloadable files.

### Get Account Context

Read the credential type and its real organization, project, instance, actor, and user metadata from Metorial. Unavailable identities remain null; the credential is never returned.

### Get Instance

Read complete instance metadata by ID or slug discovered with List Instances.

Endpoint discovery optionally includes documented response schemas with `includeResponseSchema`, in addition to the existing query and body schema option.

## Connection settings

Set a custom API base URL in the chosen authentication method. The default is `https://api.metorial.com`. The API version remains configurable, and existing saved API URL settings continue to work.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
