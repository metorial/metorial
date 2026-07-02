# Slates Specification for Svix

## Overview

Svix is a webhooks-as-a-service platform for sending webhooks to consumer applications and managing the endpoints, event catalog, retries, transformations, and operational events around those deliveries.

This integration focuses on the Svix Dispatch API.

## Authentication

- Type: API key / bearer token.
- Header: `Authorization: Bearer <token>`.
- API keys are scoped to Svix environments.
- Supported hosted regions: `us`, `eu`, `ca`, `au`, and `in`.

## Tools

### Applications

- `list_applications`
- `create_application`
- `get_application`
- `update_application`
- `delete_application`

Applications support custom UIDs, metadata, and current `throttleRate` fields. Deprecated `rateLimit` remains accepted for compatibility.

### Messages

- `send_message`
- `list_messages`
- `get_message`
- `precheck_message`
- `expunge_message_content`

Messages support event IDs, channels, tags, scheduled delivery, hourly or daily payload retention, optional application auto-creation, and transformation parameters.

### Endpoints

- `create_endpoint`
- `list_endpoints`
- `get_endpoint`
- `update_endpoint`
- `delete_endpoint`
- `get_endpoint_headers`
- `update_endpoint_headers`
- `get_endpoint_secret`
- `rotate_endpoint_secret`
- `get_endpoint_transformation`
- `update_endpoint_transformation`
- `get_endpoint_stats`
- `recover_failed_messages`

Endpoints support channels, event type filters, custom headers, signing secrets, metadata, current `throttleRate`, JavaScript transformations, delivery stats, and bulk recovery for failed deliveries.

### Event Types

- `list_event_types`
- `create_event_type`
- `get_event_type`
- `update_event_type`
- `delete_event_type`
- `import_event_types_from_openapi`

Event types support schemas, archive/deprecation state, feature flags, group names, and dry-run OpenAPI imports.

### Attempts and Portal

- `list_attempts_by_message`
- `list_attempts_by_endpoint`
- `resend_message`
- `get_portal_access`

Attempt listing supports status, status-code class, channel, tag, event type, and timestamp filters.

## Triggers

- `operational_webhooks`

The trigger auto-registers a Svix operational webhook endpoint for endpoint lifecycle events and message attempt failure/recovery events.

## Error Handling

The client maps upstream Svix failures to `ServiceError` from `@lowerdeck/error`. Tool-level validation that cannot be represented in schemas also throws `ServiceError`.
