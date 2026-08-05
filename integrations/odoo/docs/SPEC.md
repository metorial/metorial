# Odoo Integration Specification

## Overview

Odoo is a modular ERP platform whose installed applications expose business data through technical models such as `res.partner`, `crm.lead`, `sale.order`, `purchase.order`, and `account.move`. This integration supports model discovery, generic record operations, common workflow transitions, attachment downloads, and Odoo-originated change notifications.

The connection automatically selects the API transport:

- Odoo 19 and newer API-key connections use the JSON-2 endpoint at `/json/2/<model>/<method>` with named JSON arguments.
- Older servers, legacy username/password connections, and stored legacy connections use JSON-RPC `execute_kw` calls.

Available models, fields, methods, and records always depend on the installed modules, edition, plan, connected user's permissions, record rules, and company context.

## Authentication and configuration

Every connection needs an absolute Odoo instance URL. The integration removes trailing slashes and rejects URLs containing credentials, query parameters, or fragments.

### API key

API-key authentication is recommended. Supply:

- the Odoo instance URL;
- the user's login email;
- an API key from the Odoo account security settings;
- the database name when using a legacy server or a multi-database deployment.

The integration detects the Odoo server version. Odoo 19+ uses the API key as a bearer credential for JSON-2 and sends `X-Odoo-Database` only when a database is configured. Legacy servers authenticate the login and API key through JSON-RPC.

### Legacy username and password

The legacy username/password method is retained only for older JSON-RPC servers. It requires the instance URL, database name, login email, and password. Use API-key authentication for new connections wherever the Odoo account supports it.

### Access considerations

- Odoo external API access is available only on plans that include it.
- Odoo Online users commonly need an API key for external access.
- Odoo access rights, record rules, installed modules, and allowed-company context govern every request.
- Odoo 19 databases publish database-specific models, fields, and callable methods on their `/doc` page.

## Tools

### Identity and discovery

- `get_current_user` returns the authenticated user ID, identity fields, locale, default company, and accessible company IDs.
- `list_models` searches visible model definitions with stable offset pagination and a separate count snapshot.
- `list_model_fields` returns field names, types, labels, access metadata, related models, selection values, and optional additional field attributes.

### Record reads

- `search_records` searches any accessible model with validated Odoo domain filters, selected fields, context, pagination, and stable ordering.
- `count_records` counts matching records without returning record bodies. An optional limit provides an upper-bound count.
- `read_records` reads up to 100 unique positive record IDs from one model and can restrict the returned fields.

Counts and record pages are independent requests. A count is not an atomic companion to a search result when the database changes concurrently.

### Record writes

- `create_record` creates one record from JSON-compatible field values and returns the positive record ID.
- `update_records` writes the same field values to up to 100 records and verifies the updated IDs.
- `delete_records` permanently deletes up to 100 records after Odoo accepts the `unlink` operation.

Use `list_model_fields` before unfamiliar writes. Relationship values must use Odoo's expected command or identifier shapes. Deletion is permanent and can be rejected by permissions, record rules, or database constraints.

### Files

- `download_attachment` downloads one binary `ir.attachment` by positive record ID and returns a file plus its Odoo ID, file name, MIME type, byte size, checksum when available, and storage type.

URL-only attachments have no stored binary content. Binary downloads are limited to 6 MiB after base64 decoding.

### Validated workflows

- `confirm_sale_order` confirms one draft or sent `sale.order` and verifies the resulting `sale` or `done` state.
- `post_invoice` posts one draft customer invoice, customer credit note, vendor bill, or vendor credit note and verifies the `posted` state.
- `confirm_purchase_order` confirms one draft or sent `purchase.order` and verifies the resulting purchase state.
- `mark_opportunity_won` marks one `crm.lead` opportunity as won and verifies its won-stage state.
- `complete_activity` completes one `mail.activity`, optionally records feedback and existing Odoo attachment IDs, and verifies that the activity is no longer pending.

These tools perform mutating business actions. They can trigger Odoo automation, accounting entries, inventory operations, deliveries, projects, communications, or other module-specific side effects. Use exact record IDs and confirm the target state before invoking them.

### Public-method fallback

- `execute_method` calls a public Odoo model or recordset method only when no dedicated tool covers the workflow.

Private method names beginning with `_` are rejected. JSON-2 accepts named parameters through `kwargs`; non-empty positional `args` are supported only for legacy JSON-RPC. The method can modify data or trigger arbitrary Odoo business side effects, so callers should prefer the dedicated record and workflow tools.

## Triggers

### Odoo Webhook Notification

`inbound_webhook` receives HTTP `POST` payloads sent by Odoo's **Send Webhook Notification** automation action. Configure the generated webhook URL as the destination in Odoo and choose the fields Odoo should send.

Object payloads are passed through as record fields. When `_model` or `model` is present, the trigger exposes it as the model name; `_id` or `id` is exposed as the record ID. Non-object JSON is retained under `_value`, and non-JSON request bodies are returned as raw text for troubleshooting. Other HTTP methods receive `405 Method Not Allowed`.

Odoo automation and webhook availability depends on the edition and installed applications. Odoo does not expose a core external API for this integration to create or manage those automation rules.

### Record Changes

`record_changes` polls `res.partner` contact records by `write_date` and emits `record.created` or `record.updated` events. The first poll establishes a baseline without replaying existing contacts. Later polls use a bounded timestamp-and-ID checkpoint, stable ordering, pagination, and deterministic event IDs to reduce gaps and duplicates at shared timestamp boundaries.

This trigger currently monitors contacts only. It does not subscribe to a universal Odoo event stream, and it does not replace an Odoo automation webhook when immediate or model-specific delivery is required.

## Error behavior

Validation, authentication, malformed provider responses, and upstream failures are returned as user-facing service errors with Odoo-specific operation context. The integration rejects invalid models, IDs, domains, JSON values, method names, incompatible JSON-2 arguments, unexpected workflow states, and missing downloadable content before reporting success.
