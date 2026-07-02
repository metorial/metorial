import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeamProjects = SlateTool.create(spec, {
  name: 'Manage Team Projects',
  key: 'manage_team_projects',
  description: `List, assign, or remove projects from a Rollbar team. Controls which projects a team has access to.
Requires an **account-level** access token.`,
  instructions: [
    'Use action "list" to see all projects assigned to a team.',
    'Use action "add" with projectId to assign a project to the team.',
    'Use action "remove" with projectId to remove a project from the team.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Operation to perform'),
      teamId: z.number().describe('Team ID'),
      projectId: z
        .number()
        .optional()
        .describe('Project ID (required for "add" and "remove" actions)')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.number().describe('Project ID'),
            name: z.string().optional().describe('Project name')
          })
        )
        .optional()
        .describe('List of team projects'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listTeamProjects(ctx.input.teamId);
      let projects = (result?.result || []).map((p: any) => ({
        projectId: p.id,
        name: p.name
      }));
      return {
        output: { projects },
        message: `Team **${ctx.input.teamId}** has **${projects.length}** projects assigned.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.projectId) throw new Error('projectId is required for "add" action');
      await client.addProjectToTeam(ctx.input.teamId, ctx.input.projectId);
      return {
        output: { success: true },
        message: `Assigned project **${ctx.input.projectId}** to team **${ctx.input.teamId}**.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.projectId) throw new Error('projectId is required for "remove" action');
      await client.removeProjectFromTeam(ctx.input.teamId, ctx.input.projectId);
      return {
        output: { success: true },
        message: `Removed project **${ctx.input.projectId}** from team **${ctx.input.teamId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
