# Productlane integration

Manage customer companies, contacts, feedback threads, public roadmap items,
upvotes, and changelogs. The integration also reads workspace branding and
workspace members.

## API and authentication

The existing tools use `https://productlane.com/api/v1` and send API keys as
Bearer tokens. Keep an existing v1 key for this integration. Productlane now
issues v2 keys with the `pl_v2_` prefix; this integration does not yet implement
the v2 payloads and routes. Productlane announced a v1 sunset of 20 November
2026. See the [current API guide](https://productlane.com/docs/integrations/api)
and [legacy authentication reference](https://productlane.readme.io/reference/api-authentication).

Workspace-scoped tools accept `workspaceId` as input and fall back to the
optional configured workspace. Find the ID in `list_contacts` or
`list_companies` results, or in Settings → API.

## Available workflows

- List, retrieve, create, update, and delete companies and contacts.
- List, retrieve, create, and update feedback threads, and send thread replies.
- List portal projects and issues, retrieve projects, and manage upvotes.
- Submit portal feedback with `create_portal_feedback`: provide customer email,
  feedback text, pain level, and workspace ID; optionally link a portal project
  and choose notification preferences. The tool preserves the provider's
  response because the legacy reference does not specify its response fields.
- List, retrieve, create, update, and delete changelogs.
- Retrieve a workspace and list its users.

`create_company` additionally accepts the `domain` and `segments` fields
specified in the legacy company reference. Existing `domains` and company
attribute inputs remain available for compatibility.

Provider webhooks exist, but this integration does not register triggers.

## References

- [Legacy endpoint index](https://productlane.readme.io/llms.txt)
- [Company creation](https://productlane.readme.io/reference/companies-newcompany)
- [Company listing and pagination](https://productlane.readme.io/reference/companies-listcompanies)
- [Portal feedback request schema](https://productlane.readme.io/reference/portal-createfeedback)
- [Workspace retrieval](https://productlane.readme.io/reference/workspaces-get)

The legacy reference contains older customer/insight routes that differ from
some existing contact/thread routes. Those routes and response mappings have
been retained pending a separate v2 migration and provider verification.
