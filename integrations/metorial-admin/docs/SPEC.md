# Metorial Admin Integration

## Overview

The `metorial-admin` integration uses Metorial OAuth or API key authentication to expose a controlled dynamic wrapper for Metorial dashboard instance API endpoints. It does not use the generated Metorial SDK because endpoint discovery and dispatch are driven by runtime introspection.

## Config

- `apiUrl`: Metorial API base URL. Defaults to `https://api.metorial.com` and is normalized by trimming trailing slashes.
- `apiVersion`: Metorial API version. Defaults to `mt_2026_01_01_magnetar`.

## Auth

The integration supports two auth methods:

- `api_key`: token auth that accepts a Metorial API key and returns it as the shared bearer `token` output.
- `oauth`: OAuth auth for interactive Metorial authorization.

The `api_key` method accepts optional `apiUrl` input to override the configured API URL for authenticated tool calls. When omitted, tools use the integration config.

For `oauth`:

- Authorization URL: `${apiUrl}/oauth/authorize`
- Token URL: `${apiUrl}/oauth/token`
- Refresh URL: `${apiUrl}/oauth/token`
- Profile URL: `${apiUrl}/oauth/userinfo`

Auth input may include `apiUrl` to override the configured API URL for the OAuth flow. The resolved URL is stored in auth output and used for token refresh, profile lookup, and authenticated tool calls. Auth output also includes the access token, optional refresh token, optional expiration, user identity fields, and organization identity fields when returned by Metorial.

## Tools

### `list_endpoints`

Fetches `${apiUrl}/metorial/introspect/endpoints?version=${apiVersion}`, enriches endpoints with controller/query/body metadata, filters hidden/deprecated/confidential/non-dashboard-instance endpoints, strips internal fields, and returns compact endpoint metadata by default. Set `includeSchemas` to include query and body schemas.

### `list_instances`

Calls `GET ${apiUrl}/instances` with `Authorization: Bearer <token>` and `Metorial-Version: <apiVersion>`. It does not send `metorial-instance-id`.

### `call_endpoint`

Refreshes endpoint introspection, validates `method + endpointPath`, fills `:instanceId` from `instanceId`, fills additional path parameters from `pathParams`, sends `Authorization`, `Metorial-Version`, and `metorial-instance-id`, and dispatches the request.

JSON responses return inline as `data`. Empty responses return status metadata. Non-JSON responses return a Slate attachment with only metadata inline.
