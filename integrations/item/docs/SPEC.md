# Item API Integration Specification

## Overview

item provides API access to organization data stored as People, Companies, and custom objects. The API is centered on flat object records, saved views for filtered retrieval, metadata discovery, batch upserts, and webhook-triggered skill runs.

## Reference

- API overview and authentication: <https://docs.item.app/index>
- Machine-readable OpenAPI specification: <https://docs.item.app/openapi.yaml>
- Documentation index: <https://docs.item.app/llms.txt>

Each tool carries its own endpoint reference in its `docs` entry, so per-endpoint URLs are
not duplicated here. This specification was last reconciled against the published OpenAPI
document on 2026-07-31.

The base URL is `https://app.useitem.io`.

## Authentication

item uses API key authentication for all requests. Pass the key in the `x-api-key` header, and generate it from **Settings > System > API Key** in the item workspace. Keys are organization-scoped and documented as starting with `sk_live_`, though the integration accepts any non-empty value so an undocumented key format cannot lock a customer out.

The API key is the only required credential for the endpoints documented here. There is no OAuth flow described in the official docs.

The API exposes no current-user, profile, or account endpoint, so there is no identity tool. Credential validity is instead checked at connect time by calling the schema endpoint.

## Features

### Object record management

Create, retrieve, list, update, and soft-delete records for People, Companies, and custom object types. List operations support pagination, search, sorting, and field-based filters, while single-record lookups can fetch by ID or by email for contacts.

All five operations share the `/api/objects/{objectType}` path and are distinguished by method, which is worth stating because the mapping is not the conventional one:

| Method | Operation |
| --- | --- |
| `GET` | List records, or fetch a single record when `id` or `email` is supplied |
| `PUT` | Create a record |
| `PATCH` | Update one or more fields |
| `DELETE` | Soft-delete a record, with the target `id` in the request body |
| `POST` | Update a single custom field — **legacy**, superseded by `PATCH` |

The single `GET` returns two different response shapes: `data` is an array in list mode and a single object in single-record mode. Field-based filters match as a case-insensitive partial match, so `filter[name]=Acme` also matches `Acme Corporation`.

The legacy `POST` endpoint is intentionally not exposed as a tool, because `PATCH` covers every field it can update and accepts multiple fields per call.

### Batch upsert

Create or update up to 100 records in one request for scheduled sync jobs and bulk imports. Each row is processed independently, supports matching by ID, email, or name, and returns per-record success or failure status.

### Shared views

List shared views configured in the item UI and execute them to pull filtered, sorted records with the view's saved column layout. This is the recommended retrieval pattern when workflows should respect business-defined filters instead of rebuilding them in the API client.

### Schema discovery

Fetch all available object types and their field definitions, including custom objects, select options, relationship metadata, and field requirements. This is useful for discovering valid field names before creating or updating records.

### Organization users

List users in the organization along with their IDs and access levels. This supports use cases like mapping `owned_by_user_id` fields or assigning records to the correct teammates.

### Skill webhook triggering

Trigger a live item skill through its webhook endpoint by sending any JSON object as input context. Optionally include an HMAC-SHA256 signature in the `x-webhook-signature` header using the API key as the secret for payload verification.

## Events

The provider does not support events.

item exposes a webhook endpoint for **triggering** skills, but the official API docs do not describe outbound webhook subscriptions, event streams, or polling-specific change feeds intended for receiving provider events. The published OpenAPI document declares only the object, view, batch, schema, user, and skill-webhook paths, with no subscription-management operations.
