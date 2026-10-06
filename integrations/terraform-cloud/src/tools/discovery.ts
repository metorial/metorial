import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import {
  mapOrganization,
  mapPagination,
  mapTeamWorkspaceAccess,
  mapUser
} from '../lib/mappers';
import { spec } from '../spec';

const pagination = z.object({
  currentPage: z.number(),
  totalPages: z.number(),
  totalCount: z.number(),
  pageSize: z.number()
});
const page = {
  pageNumber: z.number().optional().describe('Positive page number; defaults to 1'),
  pageSize: z.number().optional().describe('Results per page, 1–100; defaults to 20')
};
const access = z.object({
  teamWorkspaceAccessId: z.string(),
  teamId: z.string(),
  workspaceId: z.string(),
  access: z.string(),
  runs: z.string(),
  variables: z.string(),
  stateVersions: z.string(),
  planOutputs: z.string(),
  sentinelMocks: z.string(),
  workspaceLocking: z.boolean(),
  runTasks: z.boolean()
});
export const getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the authenticated HCP Terraform account. Team/group and organization tokens return a service account and the associated authenticated resource ID.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      username: z.string(),
      email: z.string(),
      avatarUrl: z.string(),
      isServiceAccount: z.boolean(),
      authenticatedResourceId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const output = mapUser((await createClient(ctx).getAccountDetails()).data);
    return {
      output,
      message: `Authenticated account **${output.username || output.userId}**.`
    };
  })
  .build();
export const listOrganizationsTool = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description:
    'Discover authorized organization names for subsequent organization-scoped operations. Returns one provider page and current permissions; no configured organization is required.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      ...page,
      search: z
        .string()
        .optional()
        .describe('Search by organization name or notification email')
    })
  )
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationId: z.string(),
          name: z.string(),
          email: z.string(),
          createdAt: z.string(),
          permissions: z.record(z.string(), z.boolean())
        })
      ),
      pagination,
      returnedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const response = await createClient(ctx).listOrganizations(ctx.input);
    const organizations = response.data
      .map(mapOrganization)
      .map((value: ReturnType<typeof mapOrganization>) => ({
        organizationId: value.organizationId,
        name: value.name,
        email: value.email,
        createdAt: value.createdAt,
        permissions: value.permissions
      }));
    return {
      output: {
        organizations,
        pagination: mapPagination(response.meta),
        returnedCount: organizations.length
      },
      message: `Returned **${organizations.length}** authorized organization(s) on this page.`
    };
  })
  .build();
export const listTeamWorkspaceAccessTool = SlateTool.create(spec, {
  name: 'List Team Workspace Access',
  key: 'list_team_workspace_access',
  description:
    'List team/group grants on a workspace, including relationship IDs needed by delete_team_workspace_access. Actual visibility depends on the token permissions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace ID from list_workspaces'),
      ...page
    })
  )
  .output(z.object({ grants: z.array(access), pagination, returnedCount: z.number() }))
  .handleInvocation(async ctx => {
    const response = await createClient(ctx).listTeamWorkspaceAccess(
      ctx.input.workspaceId,
      ctx.input
    );
    const grants = response.data.map(mapTeamWorkspaceAccess);
    return {
      output: {
        grants,
        pagination: mapPagination(response.meta),
        returnedCount: grants.length
      },
      message: `Returned **${grants.length}** workspace grant(s) on this page.`
    };
  })
  .build();
export const deleteTeamWorkspaceAccessTool = SlateTool.create(spec, {
  name: 'Delete Team Workspace Access',
  key: 'delete_team_workspace_access',
  description:
    'Revoke one workspace-specific team/group grant. Obtain its relationship ID from list_team_workspace_access or set_team_workspace_access. Other organization/project-level grants can still provide access.',
  tags: { destructive: true }
})
  .input(
    z.object({
      teamWorkspaceAccessId: z
        .string()
        .describe(
          'Exact relationship ID from list_team_workspace_access or set_team_workspace_access'
        )
    })
  )
  .output(z.object({ teamWorkspaceAccessId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await createClient(ctx).deleteTeamWorkspaceAccess(ctx.input.teamWorkspaceAccessId);
    return {
      output: { teamWorkspaceAccessId: ctx.input.teamWorkspaceAccessId, deleted: true },
      message: 'Removed the workspace-specific grant.'
    };
  })
  .build();
