import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamPerformance = SlateTool.create(spec, {
  name: 'Get Team Performance',
  key: 'get_team_performance',
  description: `Retrieve a team performance report including booked meetings, sequenced contacts, conversion rates, reply sentiment breakdown, and per-member metrics. Requires a date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().describe('Start date (ISO-8601 format, e.g. "2024-01-01")'),
      to: z.string().optional().describe('End date (ISO-8601 format). Defaults to today.')
    })
  )
  .output(
    z.object({
      report: z.record(z.string(), z.any()).describe('Team performance report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let report = await client.getTeamPerformance({
      from: ctx.input.from,
      to: ctx.input.to
    });

    return {
      output: { report },
      message: `Retrieved team performance report from **${ctx.input.from}**${ctx.input.to ? ` to **${ctx.input.to}**` : ''}.`
    };
  })
  .build();
