import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      records: z.array(z.record(z.string(), z.any())).describe('List of training records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let pagination = { page: ctx.input.page, perPage: ctx.input.perPage };
    let result: any;

    if (ctx.input.resourceType === 'company_training_types') {
      result = await client.listCompanyTrainingTypes(pagination);
    } else {
      result = await client.listEmployeeTrainingCourses(pagination);
    }

    let records = result?.[ctx.input.resourceType] || [];

    return {
      output: { records },
      message: `Retrieved **${records.length}** ${ctx.input.resourceType.replace(/_/g, ' ')}.`
    };
  })
  .build();
