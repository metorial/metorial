import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';
export const getTeamInfoTool = SlateTool.create(spec, {
  name: 'Get Team Info',
  key: 'get_team_info',
  description:
    'Read the API key’s native team context and Websets concurrency limits. This identifies the team, not a person; product access depends on the key and plan.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      teamId: z.string().describe('Native team identifier'),
      name: z.string().describe('Team name'),
      concurrency: z
        .object({ active: z.number(), queued: z.number() })
        .describe('Current native Websets activity'),
      limits: z
        .object({ maxConcurrent: z.number().nullable(), maxQueued: z.number().nullable() })
        .describe(
          'Native limits; null preserves the provider’s unspecified or unbounded value'
        )
    })
  )
  .handleInvocation(async ctx => {
    const row = await new ExaClient(ctx.auth.token, ctx.input).getTeamInfo();
    return {
      output: {
        teamId: row.id,
        name: row.name,
        concurrency: row.concurrency,
        limits: row.limits
      },
      message: `Retrieved team **${row.id}**.`
    };
  })
  .build();
