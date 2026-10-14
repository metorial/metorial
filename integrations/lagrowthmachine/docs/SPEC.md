# La Growth Machine API integration

La Growth Machine manages sales outreach leads, audiences, campaigns, connected identities, and a LinkedIn and email inbox.

## Authentication

Use an API key from Settings > Integrations & API. Requests use `Authorization: Bearer YOUR_API_KEY` against `https://apiv2.lagrowthmachine.com/flow`. API access requires an eligible plan. Query-string API keys are deprecated.

## Supported workflows

- Search leads by ID, email, LinkedIn URL, CRM ID, or full name plus company. The result exposes the lead profile and recent campaign logs.
- Create or update leads, optionally assigning an audience by name or ID. A missing audience name creates an audience; omit it to manage a lead without audience membership. The result includes the lead ID and provider message.
- Create an empty audience with a unique name, or import prospects from a LinkedIn URL. Imports are queued and run asynchronously through the connected identity.
- Remove a lead from audiences using professional or personal email, LinkedIn URL, Twitter handle, CRM ID, or full name plus company. A lead ID or generic email is looked up first to resolve a supported identifier.
- List campaigns with offset pagination, optional status and name filters, and a total count. The default page size is 25. Retrieve detailed campaign statistics by campaign ID.
- Update a lead's campaign status. Generic email inputs resolve to a lead ID; explicit professional or personal email and CRM ID inputs use the provider's documented payload names. Result logs identify whether a matching campaign was updated.
- Retrieve the authenticated member, list workspace members, and list connected identities.
- Queue a LinkedIn message to an existing lead conversation. Provide a connected identity and optionally a workspace member for attribution; omitted member IDs resolve to the authenticated member. Queue acceptance does not establish delivery.
- Create, list, and delete inbox webhooks for sent and received LinkedIn or email messages. Omit campaign IDs to receive events from all campaigns; an empty filter receives no events. Deletion is idempotent according to the provider.

## Official references

- [Authentication](https://developers.lagrowthmachine.com/guides/authentication/)
- [Endpoint reference](https://developers.lagrowthmachine.com/agents/endpoints/)
- [OpenAPI specification](https://developers.lagrowthmachine.com/openapi.yaml)

Provider calls and webhook delivery have not been verified with live credentials in this refresh.
