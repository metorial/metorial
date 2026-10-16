# Exist API integration

Base URL: `https://exist.io/api/2/`. See the [official API reference](https://developer.exist.io/).

## Authentication and account

[OAuth2](https://developer.exist.io/reference/authentication/oauth2/) uses the authorization-code flow at `/oauth2/authorize` and `/oauth2/access_token`. Authorization scopes are space-separated before URL encoding. Token exchanges use form encoding; refresh returns rotated access and refresh tokens and a lifetime in seconds. Both read and write scopes are requested because the official API assigns separate read and write capabilities. The existing scope list and auth method keys are preserved.

[Simple token authentication](https://developer.exist.io/reference/authentication/token/) exchanges a username and password at `/api/2/auth/simple-token/` and uses `Authorization: Token`. It is read-only. OAuth uses `Authorization: Bearer`.

`get_user_profile` calls the [current-user profile](https://developer.exist.io/reference/users/) endpoint. It reads identity, timezone, unit preferences, local time, and trial/payment flags. This API does not return an email address in its documented profile. Configuration is empty and duplicates no auth properties.

## Tools

| Tool key | Endpoint and behavior |
| --- | --- |
| `get_user_profile` | GET `/accounts/profile/`; current identity and preferences. |
| `get_attribute_templates` | GET `/attributes/templates/`; discover names, groups, priorities, and types, with pagination and optional low-priority templates. |
| `get_attributes` | GET `/attributes/`, `/attributes/owned/`, or `/attributes/with-values/`; preserves existing branches and adds supported filters. With-values supports 1–31 days and a latest date. Owned-only and metadata-only filters cannot be combined with values. |
| `get_attribute_values` | GET `/attributes/values/`; paginated daily values for one name. `dateMin` remains forwarded for compatibility but is absent from the current endpoint reference. |
| `create_attribute` | POST `/attributes/create/?success_objects=1`; templates or custom label/group/value type, optional manual flag; returns successful provider objects and per-item failures. |
| `manage_attribute_ownership` | POST `/attributes/acquire/?success_objects=1` or `/attributes/release/`; acquire by template/name or release by name. |
| `update_attribute_values` | POST `/attributes/update/`; absolute daily values, requires ownership. |
| `increment_attribute_values` | POST `/attributes/increment/`; numeric deltas, optional local date defaults to today. Successful objects include current totals when supplied. |
| `get_correlations` | GET `/correlations/` or `/correlations/combo/`; list/filter or pair lookup. Missing pair returns a provider 404 error. |
| `get_insights` | GET `/insights/`; paginated insights, date range and priority filtering. |
| `get_averages` | GET `/averages/`; latest or historical weekly records based on 60 days of data. |

All paginated tools expose actual provider continuation URLs and preserve their existing normalized outputs. All tools also expose the complete provider response in optional `raw`; writes add optional successful records and failure codes.

[Attribute reads](https://developer.exist.io/reference/attributes/), [ownership](https://developer.exist.io/reference/attribute_ownership/), [creation](https://developer.exist.io/reference/creating_attributes/), and [writes](https://developer.exist.io/reference/writing_data/) document the request and response shapes. Batches are limited to 35 records and can partially succeed with HTTP 202. Check every failure; retrying an increment can duplicate a successful write.

[Value types](https://developer.exist.io/reference/object_types/#attribute-value-types): 0 integer, 1 decimal, 2 string, 3 duration in minutes, 4 time from midnight, 5 percentage (0–1), 6 time from midday (templates only), 7 boolean represented numerically, 8 integer scale (1–9). Values use metric units; dates are local to the user. Non-null values cannot be cleared back to null. String, scale, and time-of-day attributes cannot be incremented.

HTTP failures and malformed required response fields produce service errors. No missing metrics, identifiers, or timestamps are synthesized. Original input/output JSON types, enum members, and requiredness are preserved. Null daily values and nullable correlation descriptions/service ownership remain supported.

The documented API has no webhook registration or subscription surface. No triggers or file-producing operations are exposed.
