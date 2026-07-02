import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List PagerDuty teams with optional search filtering. Teams are collections of users and escalation policies representing groups within an organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter by name'),
      limit: z.number().optional().describe('Max results (default 25, max 100)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string().describe('Team ID'),
          name: z.string().optional().describe('Team name'),
          description: z.string().optional().describe('Team description'),
          htmlUrl: z.string().optional().describe('Web URL'),
          defaultRole: z.string().optional().describe('Default role for team members')
        })
      ),
      more: z.boolean().describe('Whether more results are available'),
      total: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let result = await client.listTeams({
      query: ctx.input.query,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let teams = result.teams.map(t => ({
      teamId: t.id,
      name: t.name,
      description: t.description,
      htmlUrl: t.html_url,
      defaultRole: t.default_role
    }));

    return {
      output: {
        teams,
        more: result.more,
        total: result.total
      },
      message: `Found **${result.total}** team(s). Returned ${teams.length} result(s).`
    };
  })
  .build();
