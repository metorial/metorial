# Salesflare API coverage

Current official reference: https://api.salesflare.com/openapi.json (Salesflare API 1.0.0, Swagger 2). Authentication is `Authorization: Bearer <API key>`, with HTTPS-only requests to api.salesflare.com. No token-refresh endpoint is documented.

The 36 tools retain the original 34 keys and add internal note listing and custom-field discovery. Coverage includes account/contact/opportunity CRUD, task creation/listing/update/deletion, internal note creation/listing/update/deletion, tag CRUD, meeting/call logging, current user and team discovery, users, pipelines/stages, currencies and read-only workflows. Email campaigns, workflow mutation, data-source administration, merging existing contacts and broad custom-field administration are outside this surface.

Contacts, tasks, meetings and calls are created using the documented single-item array request. Array query values are serialized as repeated parameters. Lists expose page counts, not invented totals. Internal note listing supports account/date bounds; tasks support exact ID filters through the list endpoint, since the public API provides no task detail GET.

Read outputs preserve provider metadata and required identifiers while omitting token/credential fields. Omitted pipeline default/recurring flags and stages remain absent; they do not imply false/empty state. Mutations reject invalid identifiers, empty changes and contradictory association lists before transport. Association readback reflects all completed account changes; failures warn that earlier changes can already have applied. No write is automatically retried.

Opportunity currency is selectable during creation. The legacy update currency input remains schema-compatible but produces explicit guidance because the current update route does not document that field. Opportunity tag-name filtering accepts one name per request, matching the documented scalar provider query while retaining the historical array input.

Deleting an account can cascade to linked opportunities/tasks. Deleting a tag can remove assignments. Upserting an account can modify an existing domain match; contact force behavior affects duplicate handling. Task assignees/reminders and note mentions may notify users. Call logging creates permanent API activity without documented read/delete lifecycle; meeting deletion must not be presented as call cleanup.

The API uses HTTP status errors, including 429. No numerical rate quota or automatic retry guarantee is inferred. Transport errors omit credentials, raw request/response bodies and authentication-bearing causes.
