import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create, update, or delete a team in your HackerRank for Work account. Teams are used to organize users for collaborative hiring workflows. To create a new team, omit the teamId and provide a name. To update or delete, provide the teamId.`,
  instructions: [
    'To create a new team, omit the teamId and provide at least a team name.',
    'To update a team, provide the teamId and any fields to change.',
    'To delete a team, set the "remove" field to true. Only empty teams can be deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: z
        .string()
        .optional()
        .describe('ID of an existing team to update or delete. Omit to create a new team.'),
      name: z.string().optional().describe('Name of the team (required when creating)'),
      description: z.string().optional().describe('Description of the team'),
      remove: z.boolean().optional().describe('Set to true to delete the team (must be empty)')
    })
  )
  .output(
    z.object({
      team: z
        .record(z.string(), z.any())
        .optional()
        .describe('Team object (absent if deleted)'),
      deleted: z.boolean().optional().describe('Whether the team was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.teamId && ctx.input.remove) {
      await client.deleteTeam(ctx.input.teamId);
      return {
        output: {
          deleted: true
        },
        message: `Deleted team **${ctx.input.teamId}**.`
      };
    }

    if (ctx.input.teamId) {
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;

      let result = await client.updateTeam(ctx.input.teamId, updateData);
      let team = result.data ?? result;

      return {
        output: {
          team
        },
        message: `Updated team **${team.name ?? ctx.input.teamId}**.`
      };
    }

    if (!ctx.input.name) {
      throw new Error('Name is required when creating a new team');
    }

    let result = await client.createTeam({
      name: ctx.input.name,
      description: ctx.input.description
    });

    let team = result.data ?? result;

    return {
      output: {
        team
      },
      message: `Created team **${team.name ?? ctx.input.name}**.`
    };
  });
