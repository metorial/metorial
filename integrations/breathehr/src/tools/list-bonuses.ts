import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBonuses = SlateTool.create(spec, {
  name: 'List Bonuses',
  key: 'list_bonuses',
  description: `Retrieve bonus records from Breathe HR. Returns a paginated list of bonuses including description, amount, and award date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      bonuses: z.array(z.record(z.string(), z.any())).describe('List of bonus records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listBonuses({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let bonuses = result?.bonuses || [];

    return {
      output: { bonuses },
      message: `Retrieved **${bonuses.length}** bonus record(s).`
    };
  })
  .build();
