import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in your HackerRank for Work account. Optionally retrieve the members of a specific team. Teams organize users for collaborative hiring workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z
        .string()
        .optional()
        .describe(
          'If provided, lists the members of this specific team instead of listing all teams'
        ),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of records to return (1-100, default 100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      teams: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of team objects (when listing teams)'),
      members: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of team member objects (when listing members of a specific team)'),
      total: z.number().describe('Total number of records available'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.teamId) {
      let result = await client.listTeamMembers(ctx.input.teamId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      return {
        output: {
          members: result.data,
          total: result.total,
          offset: result.offset
        },
        message: `Found **${result.total}** members in team **${ctx.input.teamId}** (showing ${result.data.length}).`
      };
    }

    let result = await client.listTeams({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        teams: result.data,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${result.total}** teams (showing ${result.data.length}).`
    };
  });
