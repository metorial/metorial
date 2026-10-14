# MaintainX specification

MaintainX is a maintenance management platform for work orders, assets, inventory, purchasing, and team communication.

## API and authentication

Use the current REST API at `https://api.getmaintainx.com/v1` with an API key in the `Authorization: Bearer` header. Keys are generated from Settings > Integrations > API Keys > New Key.

`GET /organizations` discovers accessible organization IDs and names. Connections with one accessible organization persist its ID. Other connections use `list_organizations` and an optional per-tool `organizationId`; the selected ID is sent through `x-organization-id`. The previous saved configuration ID remains a fallback for existing connections. The public reference has no current-user or self-profile endpoint; connection profiles identify accessible organization context instead of treating an arbitrary organization member as the token owner.

## Supported workflows

- Create, retrieve, list, and update work orders. Numeric user IDs and the optional team ID are translated into the provider's assignee objects. Work-order type and procedure template fields use the provider's documented names. Status changes use `PATCH /workorders/{id}/status`; creation with a non-OPEN status and updates combining status with other fields make two requests and can partially succeed.
- Create and list work requests, with request status and priority filters.
- Create, retrieve, list, update, and delete assets, and record asset operational status. Manufacturer and model names are translated into the provider's nested request objects. Asset status objects are returned as the existing status text field.
- Create and list locations. Coordinates remain accepted input fields for compatibility, but a supplied coordinate returns an actionable validation error because the current create-location contract does not define them.
- Create and list parts. Stock quantity maps to `availableQuantity`; cost is in cents. Existing `area` and `minimumQuantity` fields use provider-documented legacy fields. `nonStock` is absent from the documented request and returns a validation error when supplied.
- List meters and record readings using `readingValue` and `readingDate`. Reading IDs are strings in the current response: `readingIdText` preserves the full ID while the older numeric `readingId` remains optional. Manual meters are limited to 10 reading-creation requests per 24 hours; automated meters require the Enterprise plan.
- Create and list purchase orders. Every supplied item needs a quantity, mapped to `quantityOrdered`; description maps to `note`. Omitted vendor is sent as `null`, which the API permits. Unit costs are in cents.
- Create and list vendors. A single email or phone input becomes the provider's `emails` or `phoneNumbers` array. Address and website are absent from the documented create-vendor request and return validation errors when supplied. Vendor listing provides IDs and names; contact details are not provided by that endpoint.
- List users, teams, categories, and conversations. Category labels map to the existing public name field. Use `list_conversations` to obtain IDs for `send_message`.

List endpoints retain provider cursors with pages of up to 200 records. Repeated query parameters serialize as `expand=asset&expand=location`. Work-order status and priority filters use the provider's plural array parameters. There is no documented server-side work-order type filter, so the existing type input filters the current response page; an empty matching page may still have a `nextCursor`.

The integration exposes no triggers or downloadable exports. MaintainX documents a webhook subscription API, but it is outside this integration's current tools.

## Official sources

- [REST API reference](https://api.getmaintainx.com/v1/docs)
- [Current OpenAPI specification](https://api.getmaintainx.com/v1/openapi.json)
- [Getting started](https://help.getmaintainx.com/build/getting-started)
- [Authentication](https://help.getmaintainx.com/build/authentication)
