import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z.object({
  teamUuid: z.string().describe('UUID of the team'),
  name: z.string().describe('Name of the team'),
  active: z.boolean().describe('Whether the team is active')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in your Leexi workspace. Returns team UUIDs, names, and active status. Useful for understanding organizational structure.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      items: z.number().optional().describe('Number of items per page (1-100, default: 10)')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema).describe('List of teams in the workspace'),
      pagination: z.object({
        page: z.number().describe('Current page number'),
        items: z.number().describe('Items per page'),
        count: z.number().describe('Total number of teams')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.listTeams({
      page: ctx.input.page,
      items: ctx.input.items
    });

    let teams = (response.data || []).map((t: any) => ({
      teamUuid: t.uuid,
      name: t.name,
      active: t.active
    }));

    return {
      output: {
        teams,
        pagination: response.pagination
      },
      message: `Found **${response.pagination.count}** teams (page ${response.pagination.page}).`
    };
  })
  .build();
