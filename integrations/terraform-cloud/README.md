# Terraform Cloud (HCP Terraform)

Manage HCP Terraform workspaces, runs, variables, projects, teams, workspace grants, policy sets, variable sets, state metadata and public outputs. Discover the connected account and accessible organizations before selecting resource IDs.

## Authentication

Connect with a user, team/group or organization API token. Set the connection API URL to the region or Terraform Enterprise installation that issued the token: `https://app.terraform.io/api/v2` by default, or `https://app.eu.terraform.io/api/v2` for HCP Europe. The URL must use HTTPS and end in `/api/v2`.

User and team tokens need the appropriate workspace permissions to queue or apply runs. Organization tokens cannot execute runs or create configuration versions. Identity discovery returns the authenticated service account for team/group and organization tokens. HCP Europe uses HCP groups; the team membership API is unavailable there. SCIM-managed team membership must be changed through the identity provider.

The optional configured organization is a convenience default. Call `list_organizations`, then pass `organizationName` to organization-scoped tools to select a different organization. Workspace-ID tools use the resource's own scope.

## Tools

| Capability | Tool keys |
| --- | --- |
| Account and organization discovery | `get_current_user`, `list_organizations`, `get_organization` |
| Workspaces | `list_workspaces`, `get_workspace`, `create_workspace`, `update_workspace`, `delete_workspace`, `lock_unlock_workspace` |
| Terraform runs | `list_runs`, `get_run`, `create_run`, `manage_run` |
| Workspace variables | `list_variables`, `create_variable`, `update_variable`, `delete_variable` |
| Projects | `list_projects`, `create_project`, `update_project`, `delete_project` |
| Teams and membership | `list_teams`, `create_team`, `delete_team`, `manage_team_members` |
| Workspace grants | `list_team_workspace_access`, `set_team_workspace_access`, `delete_team_workspace_access` |
| Variable sets | `list_variable_sets`, `create_variable_set`, `delete_variable_set` |
| State inspection | `list_state_versions`, `get_current_state` |
| Policy sets | `list_policy_sets`, `create_policy_set`, `delete_policy_set` |
| Workspace notifications | `list_notifications`, `create_notification`, `delete_notification` |
| Workspace dependency configuration | `list_run_triggers`, `create_run_trigger`, `delete_run_trigger` |

## Behavior and permissions

Paginated tools return one provider page. Use positive integral `pageNumber` and `pageSize` values; the default size is 20 and the maximum is 100. Run-trigger listing defaults to inbound dependencies; select `type: "outbound"` to discover downstream workspaces. Current-state reads fetch every output page within a bounded 10,000-output window. `outputsReady: false` means the provider is still extracting outputs; retry later.

Sensitive workspace variable values are empty strings and sensitive state-output values are `null`, even if an upstream response contains their plaintext. Notification URLs omit credential-bearing paths and query parameters. HCP Terraform email notification addresses resolve to accepted members of the workspace's organization; no invitation is sent. Terraform Enterprise also supports direct email recipient addresses. A generic notification's HMAC secret is write-only. Notifications are disabled by default; enabling them can send verification or event deliveries.

Team membership inputs remain usernames. Adding resolves accepted organization members to user IDs; removal uses the current API's username contract. The legacy `organizationAccess.manageRuns` field is retained for compatibility, but `true` is rejected because the current organization-access API has no such permission. Use workspace grants for run permissions. `set_team_workspace_access` creates a grant and returns its relationship ID; list and revoke grants with the corresponding tools. Revoking a workspace grant does not revoke permissions inherited from organization or project roles.

Agent-mode workspace creation requires an existing `agentPoolId`. Workspace creation can connect an existing VCS OAuth token. Runs use an already uploaded configuration version or the workspace's current configuration. Configuration upload, state-file upload/download, registry administration, agent-pool administration, audit logs and run-task administration are outside this tool set.

## Operational effects

Deleting a workspace permanently removes its content. Applying or destroying runs can change real infrastructure and incur costs. Run actions are asynchronous: acceptance does not mean completion; inspect `get_run`. Force-execute cancels prior incomplete runs and unlocks the workspace. Force-cancel requires a prior graceful cancellation and the provider's cool-off prerequisite. Team changes and global policy/variable sets can affect many users or workspaces. Use controlled resources and the required permissions before making these changes.

`allowEmptyApply: true` can automatically apply an empty plan even when `autoApply` is false. Leave it false when applying must wait for separate confirmation. Run listing excludes speculative plan-only runs by default; pass the optional `operation` filter to include them.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
