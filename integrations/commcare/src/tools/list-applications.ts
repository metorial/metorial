import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApplications = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `Retrieve applications in a CommCare project. Applications define the forms, modules, and case structure used for data collection.
Useful for understanding the data model and discovering form types available in the project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      applications: z.array(
        z.object({
          applicationId: z.string(),
          applicationName: z.string(),
          version: z.number(),
          domain: z.string(),
          modules: z.array(z.any())
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listApplications({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let applications = result.objects.map(a => ({
      applicationId: a.id,
      applicationName: a.name,
      version: a.version,
      domain: a.domain,
      modules: a.modules
    }));

    return {
      output: {
        applications,
        totalCount: result.meta.total_count,
        hasMore: result.meta.next !== null,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Found **${result.meta.total_count}** applications. Returned ${applications.length} results.`
    };
  })
  .build();
