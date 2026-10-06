import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageParams, paginationSchema, readRows } from '../lib/response';
import { spec } from '../spec';

export let listTraining = SlateTool.create(spec, {
  name: 'List Training',
  key: 'list_training',
  description: `Retrieve training data from Breathe HR. Fetch either **company training types** (the types of training configured for the company) or **employee training courses** (individual course records assigned to employees).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['company_training_types', 'employee_training_courses'])
        .describe(
          'Whether to list company training types or employee training course records'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema.optional(),
      records: z.array(z.record(z.string(), z.unknown())).describe('List of training records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });

    const result = await client.list(ctx.input.resourceType, pageParams(ctx.input));
    const records = readRows(result, ctx.input.resourceType);
    return {
      output: { records, pagination: result.pagination },
      message: `Retrieved **${records.length}** record(s).`
    };
  })
  .build();
