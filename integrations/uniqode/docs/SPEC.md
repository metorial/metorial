# Uniqode integration

Authenticate with a Uniqode API key. Requests use `Authorization: Token <key>` over HTTPS to `https://api.uniqode.com/api/2.0/`. The saved credential field remains `token`, and existing connections retain their optional `organizationId` configuration. There is no OAuth refresh flow.

Use `list_organizations` to discover accessible organizations. QR creation, card tools, and current QR analytics accept an organization ID directly and fall back to the optional configured default. List tools expose organization filters where applicable. Card tools require a valid organization selection, but connection setup requires only the API key.

## Supported workflows

- **QR Code:** create, list, retrieve, update, delete, activate, deactivate, and query current scan analytics. Creation supports documented static content, dynamic campaign parameters, design templates, and tag IDs. List pagination supports `page`/`pageSize`; legacy `limit`/`offset` inputs remain available.
- **Digital Business Card:** list, retrieve, create, update, delete, activate, and deactivate. Creation and updates require first name and card customization settings. Contact, social, template, and other documented fields can be supplied using provider field names. Complete card objects are returned.
- **Campaign content:** list/create/update legacy landing pages, list feedback forms, and read form responses. Response queries support organization, time window, timezone, and page filters.
- **Legacy proximity resources:** list/update BLE beacons and NFC tags, list/create/update/delete geofences, and list places. These existing interfaces remain available; their current provider availability has not been verified.
- **Legacy reporting:** overview, performance, and impressions interfaces remain available. Prefer `get_qr_analytics` for current QR reports. Complete provider responses are retained in `raw`; incompatible optional summaries are omitted without substituting counts or state.

The official API defines QR Code and Digital Business Card as separate resource families. Those two product families form tool categories. Organization discovery and older shared/proximity tools remain uncategorized.

## Limits

File downloads are not implemented. The documented QR download endpoint returns download URL metadata rather than the image body; its public reference provides no response example establishing URL fields, retention, or expiry. Bulk generation, card leads, template administration, media upload, webhook triggers, and emailed exports are outside this implementation.

No live provider operations were used to verify this release. Provider permissions, plan availability, legacy endpoints, and deployed runtime behavior require live verification.

## Official references

- [API reference and authentication](https://apidocs.uniqode.com/)
- [QR Code API](https://apidocs.uniqode.com/#0854795d-b681-4196-ba6a-f5f54f1fcbfd)
- [Digital Business Card API](https://apidocs.uniqode.com/#d631da62-b420-41d9-b0f6-d094455991ef)
- [Organizations](https://apidocs.uniqode.com/#9bc86b82-6e43-49ae-b685-cf5e9120a719)
- [Analytics](https://apidocs.uniqode.com/#69fae0d1-a463-4e89-a7f2-12c32b3ffb32)
- [Getting started and API key setup](https://docs.uniqode.com/en/articles/6064771-getting-started-with-static-and-dynamic-qr-code-api)
