import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageParams, paginationSchema, readRows } from '../lib/response';
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
      pagination: paginationSchema.optional(),
      bonuses: z.array(z.record(z.string(), z.unknown())).describe('List of bonus records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    const result = await client.list('bonuses', { ...pageParams(ctx.input, true) }, true);
    const bonuses = readRows(result, 'bonuses');
    return {
      output: { bonuses, pagination: result.pagination },
      message: `Retrieved **${bonuses.length}** bonus record(s).`
    };
  })
  .build();
