import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageParams, paginationSchema, readRows } from '../lib/response';
import { spec } from '../spec';

export let listSalaries = SlateTool.create(spec, {
  name: 'List Salaries',
  key: 'list_salaries',
  description: `Retrieve salary records from Breathe HR. Returns a paginated list of salary entries including amount, start date, end date, and basis.`,
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
      salaries: z.array(z.record(z.string(), z.unknown())).describe('List of salary records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    const result = await client.list('salaries', { ...pageParams(ctx.input, true) }, true);
    const salaries = readRows(result, 'salaries');
    return {
      output: { salaries, pagination: result.pagination },
      message: `Retrieved **${salaries.length}** salary record(s).`
    };
  })
  .build();
