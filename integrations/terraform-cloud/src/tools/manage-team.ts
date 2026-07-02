import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapPagination, mapTeam } from '../lib/mappers';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.string(),
  name: z.string(),
  visibility: z.string(),
  usersCount: z.number(),
  organizationAccess: z.object({
    managePolicies: z.boolean(),
    manageWorkspaces: z.boolean(),
    manageVcsSettings: z.boolean(),
    manageProviders: z.boolean(),
    manageModules: z.boolean(),
    manageRuns: z.boolean(),
    manageProjects: z.boolean(),
    readWorkspaces: z.boolean(),
    readProjects: z.boolean()
  })
});

export let listTeamsTool = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in the organization. Returns team details including member count, visibility, and organization-level access permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema),
      pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        totalCount: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listTeams({
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let teams = (response.data || []).map(mapTeam);
    let pagination = mapPagination(response.meta);

    return {
      output: { teams, pagination },
      message: `Found **${pagination.totalCount}** team(s).`
    };
  })
  .build();

export let createTeamTool = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Create a new team in the organization. Configure organization-level permissions to control what the team can manage (workspaces, policies, VCS, providers, modules, runs, projects).`
})
  .input(
    z.object({
      name: z.string().describe('Name of the team'),
      visibility: z
        .enum(['secret', 'organization'])
        .optional()
        .describe(
          'Team visibility — "secret" hides the team, "organization" makes it visible'
        ),
      organizationAccess: z
        .object({
          managePolicies: z.boolean().optional(),
          manageWorkspaces: z.boolean().optional(),
          manageVcsSettings: z.boolean().optional(),
          manageProviders: z.boolean().optional(),
          manageModules: z.boolean().optional(),
          manageRuns: z.boolean().optional(),
          manageProjects: z.boolean().optional(),
          readWorkspaces: z.boolean().optional(),
          readProjects: z.boolean().optional()
        })
        .optional()
        .describe('Organization-level access permissions')
    })
  )
  .output(teamSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.createTeam(ctx.input);
    let team = mapTeam(response.data);

    return {
      output: team,
      message: `Created team **${team.name}** (${team.teamId}).`
    };
  })
  .build();

export let deleteTeamTool = SlateTool.create(spec, {
  name: 'Delete Team',
  key: 'delete_team',
  description: `Permanently delete a team. This revokes all workspace access granted to the team.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('The team ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTeam(ctx.input.teamId);

    return {
      output: { deleted: true },
      message: `Team ${ctx.input.teamId} has been deleted.`
    };
  })
  .build();

export let manageTeamMembersTool = SlateTool.create(spec, {
  name: 'Manage Team Members',
  key: 'manage_team_members',
  description: `Add or remove users from a team. Users are specified by their Terraform Cloud usernames.`
})
  .input(
    z.object({
      teamId: z.string().describe('The team ID to modify'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove members'),
      usernames: z.array(z.string()).describe('List of Terraform Cloud usernames')
    })
  )
  .output(
    z.object({
      teamId: z.string(),
      action: z.string(),
      usernames: z.array(z.string()),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'add') {
      await client.addTeamMembers(ctx.input.teamId, ctx.input.usernames);
    } else {
      await client.removeTeamMember(ctx.input.teamId, ctx.input.usernames);
    }

    return {
      output: {
        teamId: ctx.input.teamId,
        action: ctx.input.action,
        usernames: ctx.input.usernames,
        success: true
      },
      message: `Successfully ${ctx.input.action === 'add' ? 'added' : 'removed'} **${ctx.input.usernames.length}** user(s) ${ctx.input.action === 'add' ? 'to' : 'from'} team ${ctx.input.teamId}.`
    };
  })
  .build();

export let setTeamWorkspaceAccessTool = SlateTool.create(spec, {
  name: 'Set Team Workspace Access',
  key: 'set_team_workspace_access',
  description: `Grant a team access to a workspace with a specific permission level. Use "custom" access for granular control over runs, variables, state versions, and other workspace features.`,
  instructions: [
    'For "custom" access level, provide the individual permission fields.',
    'Standard access levels (read, plan, write, admin) have pre-defined permission sets.'
  ]
})
  .input(
    z.object({
      teamId: z.string().describe('The team ID to grant access to'),
      workspaceId: z.string().describe('The workspace ID to grant access on'),
      access: z
        .enum(['read', 'plan', 'write', 'admin', 'custom'])
        .describe('Access level for the team'),
      runsPermission: z
        .enum(['read', 'plan', 'apply'])
        .optional()
        .describe('Runs permission (for custom access)'),
      variablesPermission: z
        .enum(['none', 'read', 'write'])
        .optional()
        .describe('Variables permission (for custom access)'),
      stateVersionsPermission: z
        .enum(['none', 'read-outputs', 'read', 'write'])
        .optional()
        .describe('State versions permission (for custom access)'),
      planOutputsPermission: z
        .enum(['none', 'read'])
        .optional()
        .describe('Plan outputs permission (for custom access)'),
      sentinelMocksPermission: z
        .enum(['none', 'read'])
        .optional()
        .describe('Sentinel mocks permission (for custom access)'),
      workspaceLockingPermission: z
        .boolean()
        .optional()
        .describe('Whether the team can lock/unlock the workspace (for custom access)'),
      runTasksPermission: z
        .boolean()
        .optional()
        .describe('Whether the team can manage run tasks (for custom access)')
    })
  )
  .output(
    z.object({
      teamId: z.string(),
      workspaceId: z.string(),
      access: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.addTeamWorkspaceAccess(ctx.input);

    return {
      output: {
        teamId: ctx.input.teamId,
        workspaceId: ctx.input.workspaceId,
        access: ctx.input.access,
        success: true
      },
      message: `Granted **${ctx.input.access}** access to team ${ctx.input.teamId} on workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();
