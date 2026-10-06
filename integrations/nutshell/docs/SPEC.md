# Nutshell API coverage

Official documentation distinguishes the primary REST API from the JSON-RPC API,
which remains supported indefinitely. Existing integer-ID tools preserve JSON-RPC
semantics; the custom-field definition tool uses current REST discovery.

| Capability | Tools |
| --- | --- |
| Contacts and companies | Create, get, update, find; generic revision-aware delete |
| Leads | Create, get, update, find; documented status/outcome and relationship handling |
| Activities | Create and find; generic get and delete |
| Tasks | Create; generic get and delete |
| Notes | Add to contacts, companies or leads; generic get and delete |
| Discovery | Current user and instance, products, pipelines/stages, users/teams, activity types, sources, custom fields |
| History and search | Universal CRM search and contact/company/lead timelines |

Authentication uses HTTPS Basic authentication with an API key. Impersonation and
user permissions apply. JSON-RPC success envelopes can contain application errors;
HTTP success alone does not confirm an operation. Updates and deletion use revisions,
and deletion does not allow revision bypass. File delivery, outreach, merge,
notification settings, sales-process management, and account administration are
outside this tool surface.

References: [developer hub](https://developers.nutshell.com/),
[authentication](https://developers.nutshell.com/docs/api-authentication),
[JSON-RPC guide](https://developers-rpc.nutshell.com/),
[method contracts](https://developers-rpc.nutshell.com/detail/class_core.html),
[API IDs](https://developers.nutshell.com/docs/api-ids), and
[custom-field discovery](https://developers.nutshell.com/reference/6f66fdf709475681e4e16528980ec105).
