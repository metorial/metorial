import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, update, or delete teams within a project. Teams can be used to organize agents and assign tickets.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'list']).describe('Action to perform'),
      teamId: z.string().optional().describe('Team ID (required for update and delete)'),
      name: z.string().optional().describe('Team name (required for create)'),
      teamData: z.record(z.string(), z.any()).optional().describe('Additional team data')
    })
  )
  .output(
    z.object({
      team: z
        .record(z.string(), z.any())
        .optional()
        .describe('The team object (for create/update)'),
      teams: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of teams (for list)'),
      deleted: z.boolean().optional().describe('Whether the team was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    if (ctx.input.action === 'list') {
      let teams = await client.listTeams();
      let teamList = Array.isArray(teams) ? teams : [];
      return {
        output: { teams: teamList },
        message: `Retrieved **${teamList.length}** teams.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('Name is required when creating a team');
      }
      let team = await client.createTeam({
        name: ctx.input.name,
        ...(ctx.input.teamData || {})
      });
      return {
        output: { team },
        message: `Created team **${ctx.input.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.teamId) {
        throw new Error('teamId is required when updating a team');
      }
      let updateData: Record<string, any> = { ...(ctx.input.teamData || {}) };
      if (ctx.input.name) {
        updateData.name = ctx.input.name;
      }
      let team = await client.updateTeam(ctx.input.teamId, updateData);
      return {
        output: { team },
        message: `Updated team **${ctx.input.teamId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.teamId) {
        throw new Error('teamId is required when deleting a team');
      }
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: { deleted: true },
        message: `Deleted team **${ctx.input.teamId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
