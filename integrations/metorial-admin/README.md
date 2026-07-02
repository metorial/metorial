# <img src="logo.svg" height="20"> Metorial Admin

Metorial Admin exposes a controlled dynamic wrapper around Metorial dashboard instance API endpoints. It lists callable endpoints from Metorial introspection, lists instances available to the authenticated actor, and calls validated dashboard instance endpoints with Metorial OAuth or API key authentication.

## Tools

### List Endpoints

List callable Metorial dashboard instance API endpoints from runtime introspection. Hidden, deprecated, confidential, and non-instance endpoints are excluded.

### List Instances

List Metorial instances visible to the authenticated actor without sending a `metorial-instance-id` header.

### Call Endpoint

Call a Metorial dashboard instance API endpoint that appears in List Endpoints. The endpoint is revalidated against current introspection before dispatch. JSON responses are returned inline, empty responses return status metadata, and non-JSON responses are returned as Slate attachments.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
