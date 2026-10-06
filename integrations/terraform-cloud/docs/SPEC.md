# HCP Terraform integration specification

Version 0.3.1 exposes 42 REST API v2 tools. All 38 historical tool keys and field types remain available; four tools add account/organization discovery and workspace-grant discovery/revocation. Tool schemas are top-level objects. There are no registered event triggers. Workspace run-trigger configuration is an ordinary API capability.

The [README](../README.md) lists the complete public tool surface, authentication, permissions, paging and effects. The selected HTTPS `/api/v2` connection origin is used for all authenticated requests, including account discovery. A stored legacy configuration API URL remains readable for existing connections. The configured organization is optional; explicit organizationName inputs take precedence for organization-scoped operations.

## API contracts

- JSON:API resource types, IDs, attributes and pagination are checked before mapping selected public fields. Errors do not echo tokens, request bodies, state values or upstream messages. Paths encode resource IDs and names; requests have a timeout and do not forward credentials through redirects.
- Workspace list/create and name lookup use organization-scoped routes; ID reads/updates/deletion and lock actions use workspace routes. Agent execution needs an existing agent pool.
- Runs use `/runs` and workspace run collections. Apply, discard, cancel, force-cancel and force-execute return asynchronous acceptance. `allowEmptyApply` can automatically apply empty plans even with auto-apply disabled. Run lists exclude plan-only runs by default; the optional operation filter includes them. New run and access-grant responses must match the requested workspace/configuration/team relationships, and paginated responses must match the requested page.
- Workspace variables use the nested workspace `/vars` routes. Sensitive values are always hidden and missing sensitivity classifications fail closed.
- State versions are listed at `/state-versions` using required organization-name and workspace-name filters resolved from the requested workspace ID. State output listing is paginated; current-state reads fetch all pages and distinguish pending extraction from an empty result.
- Run-trigger lists include the required inbound/outbound filter. Creates identify an existing source workspace through the sourceable relationship.
- Membership adds use user IDs resolved from accepted organization members; removals use usernames. HCP Europe membership operations direct callers to HCP group administration.
- Workspace-grant creation/listing uses `/team-workspaces`; deletion uses the exact relationship ID. Granular permission fields require custom access.
- HCP Terraform notification email addresses resolve against the workspace's owning organization and produce a users relationship; Terraform Enterprise retains direct email-addresses support. Notifications are disabled by default. Returned URLs are redacted and HMAC secrets are never mapped.

## Primary references

- [API overview](https://developer.hashicorp.com/terraform/cloud-docs/api-docs)
- [Account](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/account), [Organizations](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organizations), [API tokens](https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens)
- [Workspaces](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces), [Runs](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run), [Workspace variables](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables)
- [Projects](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/projects), [Teams](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/teams), [Membership](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-members), [Organization memberships](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organization-memberships), [Workspace grants](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-access)
- [Variable sets](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/variable-sets), [Policy sets](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/policy-sets)
- [State versions](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions), [State outputs](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-version-outputs)
- [Current official SDK OpenAPI](https://github.com/hashicorp/go-tfe/blob/80416ebd711140e637c39beb3f32b587926ad956/v2/openapi/spec.json) confirms the plural notification JSON:API type and the email-addresses attribute. The current main branch uses generated v2 models; historical root-level SDK files are no longer present. The [official Kubernetes operator reference](https://developer.hashicorp.com/terraform/cloud-docs/integrations/kubernetes/api-reference) identifies direct email addresses as Terraform Enterprise only; HCP Terraform uses organization users.
- [Workspace notifications](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace), [Run triggers](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-triggers)

References checked 2026-10-05. The provider documents removal of sensitive plaintext from state-output responses on 2026-11-10; this integration redacts values now.
