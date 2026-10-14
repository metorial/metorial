import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List a page of teams in the organization. Returns team names, UUIDs, active status, and whether a team is the default. Use page to retrieve further results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      pageSize: z.number().optional().describe('Number of teams per page')
    })
  )
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamUuid: z.string().describe('UUID of the team'),
            name: z.string().describe('Name of the team'),
            isActive: z.boolean().optional().describe('Whether the team is active'),
            isDefault: z.boolean().optional().describe('Whether this is the default team')
          })
        )
        .describe('List of organization teams'),
      count: z.number().optional().describe('Total number of teams'),
      next: z.string().nullable().optional().describe('URL of the next page, or null'),
      previous: z.string().nullable().optional().describe('URL of the previous page, or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let result = await client.listTeams(ctx.input);
    let teams = result?.results ?? result;

    let mapped = teams.map((t: any) => ({
      teamUuid: t.uuid,
      name: t.name,
      isActive: t.is_active ?? t.active,
      isDefault: t.is_default
    }));

    return {
      output: {
        teams: mapped,
        count: result?.count,
        next: result?.next,
        previous: result?.previous
      },
      message: `Found **${mapped.length}** team(s).`
    };
  })
  .build();
