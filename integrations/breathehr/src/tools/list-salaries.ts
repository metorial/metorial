import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      salaries: z.array(z.record(z.string(), z.any())).describe('List of salary records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listSalaries({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let salaries = result?.salaries || [];

    return {
      output: { salaries },
      message: `Retrieved **${salaries.length}** salary record(s).`
    };
  })
  .build();
