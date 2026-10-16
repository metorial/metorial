# Metorial Admin Integration

## Overview

The `metorial-admin` integration uses Metorial OAuth or API key authentication to expose a controlled dynamic wrapper for Metorial dashboard instance API endpoints. It does not use the generated Metorial SDK because endpoint discovery and dispatch are driven by runtime introspection.

## Config

- `apiVersion`: Metorial API version. Defaults to `mt_2026_01_01_magnetar`.

## Auth

The integration supports two auth methods:

- `api_key`: token auth that accepts a Metorial API key and returns it as the shared bearer `token` output.
- `oauth`: OAuth auth for interactive Metorial authorization.

The `api_key` method accepts optional `apiUrl` input to select a custom API host for authenticated tool calls. It defaults to `https://api.metorial.com`; legacy saved `apiUrl` config remains a fallback when auth output has no URL. Auth output takes precedence over stored config.

For `oauth`:

- Authorization URL: `${apiUrl}/oauth/authorize`
- Token URL: `${apiUrl}/oauth/token`
- Refresh URL: `${apiUrl}/oauth/token`
- Profile URL: `${apiUrl}/oauth/userinfo`

Auth input may include `apiUrl` to select the API host for the OAuth flow. The resolved URL is stored in auth output and used for token refresh, profile lookup, and authenticated tool calls. Auth output also includes the access token, optional refresh token, optional expiration, user identity fields, and organization identity fields when returned by Metorial.

## Tools

### `list_endpoints`

Fetches `${apiUrl}/metorial/introspect/endpoints?version=${apiVersion}`, enriches endpoints with controller/query/body metadata, filters hidden/deprecated/confidential/non-dashboard-instance endpoints, strips internal fields, and returns compact endpoint metadata by default. Set `includeSchemas` to include query and body schemas, or `includeResponseSchema` to include documented output schemas.

### `list_instances`

Calls `GET ${apiUrl}/instances` with `Authorization: Bearer <token>` and `Metorial-Version: <apiVersion>`. It does not send `metorial-instance-id`.

### `call_endpoint`

Refreshes endpoint introspection, validates `method + endpointPath`, fills `:instanceId` from `instanceId`, fills additional path parameters from `pathParams`, sends `Authorization`, `Metorial-Version`, and `metorial-instance-id`, and dispatches the request.

JSON responses return inline as `data`. Empty responses return status metadata. Non-JSON responses are fetched and validated before their content is prepared for download, with only status, kind, MIME type, and size metadata inline. The existing `attachmentCount` field remains for compatibility and describes prepared files, not later delivery success.

### `get_account_context`

Calls `GET ${apiUrl}/token` with the bearer token and API version, without an instance header. Returns the complete response as `context`, including the credential type and available organization/project/instance/actor/member/user identities. Missing identities remain null. This endpoint returns identity metadata rather than token secrets.

### `get_instance`

Calls `GET ${apiUrl}/instances/:instanceId` with a URL-encoded ID or slug from `list_instances`, without an instance header. Returns the complete instance response under `instance`. Requires access to the instance and `organization.instance:read` where scope checking applies.

## API source and compatibility

The official [API reference](https://metorial.com/api) documents bearer authentication and the API base URL. The current official platform source confirms [instance list/details](https://github.com/metorial/metorial-platform/blob/d3b91440f4e13f274861d608e2b83b206626b58e/src/metorial/apis/core/src/controllers/instance/instances.ts), [credential identity context](https://github.com/metorial/metorial-platform/blob/d3b91440f4e13f274861d608e2b83b206626b58e/src/metorial/apis/core/src/controllers/instance/token.ts), [identity response fields](https://github.com/metorial/metorial-platform/blob/d3b91440f4e13f274861d608e2b83b206626b58e/src/metorial/presenters/src/implementation/auth/token.ts), [dashboard instance routing](https://github.com/metorial/metorial-platform/blob/d3b91440f4e13f274861d608e2b83b206626b58e/src/metorial/apis/core/src/middleware/instanceGroup.ts), [introspection metadata](https://github.com/metorial/metorial-platform/blob/d3b91440f4e13f274861d608e2b83b206626b58e/src/metorial/packages/rest/src/introspect.ts), and [OAuth routes, PKCE, and refresh request fields](https://github.com/metorial/metorial-platform/blob/d3b91440f4e13f274861d608e2b83b206626b58e/src/metorial/apis/oauth/src/skeleton.ts).

The three existing tool keys, input defaults/constraints, raw JSON and instance metadata, authentication methods and requested scopes remain compatible. This is one Metorial Admin API product; endpoint controllers do not introduce separate product categories. Token context and instance helpers use known explicit routes; generic discovery continues to exclude hidden, deprecated, confidential, and non-instance endpoints. No live provider or file delivery verification was performed for this refresh.
