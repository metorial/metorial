# Doppler

## Authentication and discovery

Requests use `Authorization: Bearer <token>` at `https://api.doppler.com`. The existing `api_token` connection accepts Personal, Service, and Service Account tokens. Permissions remain those of the supplied token; read-only and config-scoped tokens do not gain management access. There are no required resource identifiers in connection config.

`get_current_token` calls [GET /v3/me](https://docs.doppler.com/reference/auth-me) and returns the provider's actual identity metadata. Connection profiles continue to use workplace details where permitted; a 403 falls back to token identity without requiring additional workplace permissions.

## Secrets Manager tools

- `manage_projects`: list, get, create, update, and delete projects. Use list to discover project identifiers. Pagination is explicit through page and perPage; omitted values use provider defaults.
- `manage_environments`: list, retrieve, create, rename, and delete project environments.
- `manage_configs`: list, get, create, rename, clone, lock, unlock, and delete configs. Results include the provider config slug when available. [Locking](https://docs.doppler.com/reference/configs-lock) prevents renaming and deletion rather than secret changes.
- `manage_secrets`: list, get, set, or delete config secrets. Existing secret values and metadata are preserved. Optional dynamic-secret settings pass through to Doppler.
- `list_secret_names`: [list names](https://docs.doppler.com/reference/secrets-names) without reading values; optional includeManagedSecrets retains Doppler's default when omitted.
- `update_secret_note`: [update a secret note](https://docs.doppler.com/reference/secrets-update_note) across every environment in a project.
- `export_secrets`: [download](https://docs.doppler.com/reference/secrets-download) JSON, .NET JSON, ENV, ENV without quotes, YAML, or Docker format. Supports filtering, documented name transformations, and optional dynamic leases. Static exports use the authenticated provider download URL. Exports including dynamic secrets fetch once and deliver that original file content, so subsequent file access cannot create another lease. Output contains file metadata; no expiry or lease counts are invented.
- `download_secrets`: deprecated compatibility tool. Its original input, key-value output, handler, and JSON request remain available. Prefer export_secrets for new file workflows.
- `config_logs`: list and retrieve change logs, or roll back an eligible change. Rollback can overwrite current secrets.
- `activity_logs`: list or retrieve workplace activity logs.
- `manage_webhooks`: list, get, create, update, enable, disable, and delete project webhooks. The existing enabledConfigs input maps to Doppler's enableConfigs field and takes config slugs. Updates additionally support disableConfigs. Omitted fields are not cleared. No read request is required before a mutation.
- `manage_trusted_ips`: list, add, or delete trusted IP addresses or CIDR ranges for a config.
- `get_workplace`: retrieve the connected workplace's actual identifiers and contact metadata.

## Doppler Share

`share_secret` uses the separately documented [Doppler Share API](https://docs.doppler.com/reference/share-secret). It sends a plain-text value over HTTPS and returns the actual generated URL. View limits are 1–50 or -1 for unlimited; expiration is 1–90 days. Omitted values retain provider defaults. The sender request is not end-to-end encrypted; the recipient flow decrypts in the browser. See [Doppler Share security](https://docs.doppler.com/docs/share-security).

Secrets Manager and Share are separate tool categories; cross-product token identity is uncategorized.

## Verification boundary

This refresh was verified against current official references and the official Doppler SDK models with local type, schema, and build checks. No authenticated provider requests, live E2E, export-download execution, or webhook delivery checks were run.
