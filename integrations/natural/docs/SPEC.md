# Natural Slates Specification

## Overview

Natural is an agentic payments platform for wallet, payment, transfer, delegation, approval, key, webhook, and event workflows. The integration is REST-first and follows Natural OpenAPI 3.1.1, API version `0.2.0`, using `https://api.natural.com` as the base URL.

## Authentication And Configuration

Authentication uses a token auth secret named `apiKey`. Party keys use the `sk_ntl_` prefix and agent keys use the `ak_ntl_` prefix. The client sends `Authorization: Bearer <token>` and `Content-Type: application/json`.

Configuration supports optional `agentId` and `instanceId` values. `instanceId` must contain 1-1024 characters. When an `X-Agent-ID` header is sent, the client also requires and sends `X-Instance-ID`. If the credential prefix indicates an agent key, configured `agentId` usage is rejected because agent keys are already bound to one agent.

## API Model

Request bodies are wrapped in Natural's JSON:API-style `data.attributes` and `data.relationships` envelopes. Responses are unwrapped into stable top-level IDs and state fields while retaining the raw Natural resource record in outputs for downstream use. Paginated tools expose `limit` in the documented `1-100` range and return `hasMore` plus `nextCursor`.

## Safety

The integration requires `confirm: true` on money movement, approval decisions, cancellation, revocation, deletion, key creation, key revocation, and webhook secret rotation. Natural idempotency headers are exposed only where the OpenAPI marks `Idempotency-Key` as required.

One-time secrets from API key creation, agent key creation, webhook creation, and webhook secret rotation are intentionally returned in structured outputs. They are not included in messages or examples.

## Tool Surface

- Agents: list, create, get, update, delete, list customers, invite customers, revoke customers, list invitations, revoke invitations.
- Customers: list customers, get customer, list invitations, create invitations, revoke invitations, revoke customer-agent access.
- Money movement: list/create/get/cancel payments, list/get transfers, deposit funds, withdraw funds.
- Payment requests: list sent and incoming requests, create/get/fulfill/decline requests.
- Resources: list/get transactions, list/get wallets, list/remove external accounts, list counterparties.
- Approvals and party admin: list/get/approve/deny approvals, list/create/revoke party invitations, get/update party profile, list/remove party members.
- Keys: list/create/get/revoke API keys, list/create/revoke agent keys.
- Webhooks and events: list/create/get/update/delete webhooks, rotate webhook secrets, list/get events.

## Testing

Package-level schema regression coverage uses `describeMcpCompatibleToolSchemas` to ensure tool inputs stay compatible with MCP/OpenAI tool bridges. Helper tests cover JSON:API envelopes, pagination, idempotency, confirmation, and source-specific validation. Private live E2E coverage is intentionally conservative and defaults to read-only smoke checks unless fixtures or profiles explicitly enable safe mutation checks.
