# Rootly API capabilities

The integration exposes 27 tools through Rootly's HTTPS JSON:API service at `https://api.rootly.com/v1`. Requests use Bearer API-key authentication and `application/vnd.api+json`.

## Authentication and access

Create an API key under Organization Settings > API Keys. Global keys use their assigned Incident Response and On-Call roles; Team keys are restricted to their team's scope; Personal keys inherit their user's permissions. A key does not guarantee organization-wide visibility or write access. Connecting reads `/users/me` to establish the current user's identity.

## Available operations

| Capability | Tools | Provider routes |
| --- | --- | --- |
| Incidents | list, get, create, update, delete | `/incidents`, `/incidents/{id}` |
| Alerts | list, get, create, acknowledge, resolve | `/alerts`, `/alerts/{id}`, POST `/alerts/{id}/acknowledge`, POST `/alerts/{id}/resolve` |
| Action items | list across incidents or within one incident, get, create, update, delete | `/action_items`, `/action_items/{id}`, `/incidents/{id}/action_items` |
| Heartbeats | list, create, get/update/delete through `manage_heartbeat` | `/heartbeats`, `/heartbeats/{id}` |
| Identity | current user, users | `/users/me`, `/users` |
| Response configuration | current on-call coverage, schedules, escalation policies, services, teams, workflows, severities, environments | `/oncalls`, `/schedules`, `/escalation_policies`, `/services`, `/teams`, `/workflows`, `/severities`, `/environments` |

Configuration collections are read-only. The integration does not expose schedule edits, workflow execution, routing changes, dashboards, playbooks, status-page management or webhook registration.

## Contracts and effects

Ordinary lists use `page[number]` and `page[size]` and require the documented metadata and links envelope. Outputs report the number returned, optional totals/page fields, and requested related resources. Current on-call coverage is unpaginated upstream; the existing page inputs slice its complete response locally. Alert search and sorting and action-item search apply within the fetched page. The incident-scoped action-item endpoint also lacks provider status filtering and sorting: these apply within the returned page, and filtered totals are omitted. Organization-wide action-item status filtering and sorting remain provider operations.

Incident creation defaults to a normal public incident unless specified. Test and scheduled incident kinds remain available, with scheduled start/end fields and additional scheduled lifecycle statuses. Updating an incident first reads its current kind and privacy, preserves omitted settings, and rejects conversion from private to public. Action-item assignee inputs retain their string form and are sent as numeric provider user IDs. Updates verify that the action item belongs to the supplied incident before using the current global update route.

Alerts can trigger notifications and incident automation. Open alerts cannot be acknowledged. Acknowledgement and resolution require confirmed provider states, and resolution explicitly sets `resolve_related_incidents=false`. Heartbeat creation requires a notification target and alert summary even when disabled; `enabled=false` disables missed-ping alerts. Returned heartbeat details omit the ping bearer secret. Incident, action-item and heartbeat deletion permanently removes the selected record. Writes require their documented HTTP status and resource type/identity; provider errors retain safe status and retry/rate-limit metadata without credential-bearing payloads.

## Official references

- [API overview and key scopes](https://docs.rootly.com/api-reference/overview)
- [Incident creation](https://docs.rootly.com/api-reference/incidents/creates-an-incident)
- [Alert acknowledgement](https://docs.rootly.com/api-reference/alerts/acknowledges-an-alert)
- [Alert resolution](https://docs.rootly.com/api-reference/alerts/resolves-an-alert)
- [Action-item creation](https://docs.rootly.com/api-reference/incidentactionitems/creates-an-incident-action-item)
- [Heartbeat creation](https://docs.rootly.com/api-reference/heartbeats/creates-a-heartbeat)
- [Current user](https://docs.rootly.com/api-reference/users/get-current-user)
- [Official TypeScript SDK](https://docs.rootly.com/integrations/typescript-sdk) and [generated endpoint contracts](https://github.com/rootlyhq/rootly-ts/blob/master/src/generated/schema.d.ts)
