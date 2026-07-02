import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkdayClient } from '../lib/client';
import { spec } from '../spec';

let workdayReferenceSchema = z
  .object({
    id: z.string().optional().describe('Workday ID of the referenced object'),
    descriptor: z.string().optional().describe('Display name of the referenced object'),
    href: z.string().optional().describe('API href for the referenced object')
  })
  .describe('Workday reference object');

export let listWorkers = SlateTool.create(spec, {
  name: 'List Workers',
  key: 'list_workers',
  description: `Search and list workers in Workday. Returns a paginated list of worker summaries including names, emails, titles, and organization assignments. Use **search** to filter by name or other attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search term to filter workers by name or other attributes'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      offset: z
        .number()
        .optional()
        .describe('Number of results to skip for pagination (default: 0)')
    })
  )
  .output(
    z.object({
      workers: z
        .array(
          z.object({
            workerId: z.string().describe('Unique worker ID'),
            displayName: z.string().describe('Worker display name'),
            href: z.string().optional().describe('API href for this worker'),
            primaryWorkEmail: z.string().optional().describe('Primary work email address'),
            businessTitle: z.string().optional().describe('Business title'),
            supervisoryOrganization: workdayReferenceSchema
              .optional()
              .describe('Primary supervisory organization')
          })
        )
        .describe('List of workers'),
      total: z.number().describe('Total number of matching workers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkdayClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      tenant: ctx.config.tenant
    });

    let result = await client.listWorkers({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let workers = result.data.map(w => ({
      workerId: w.id,
      displayName: w.descriptor,
      href: w.href,
      primaryWorkEmail: w.primaryWorkEmail,
      businessTitle: w.businessTitle,
      supervisoryOrganization: w.primarySupervisoryOrganization
    }));

    return {
      output: { workers, total: result.total },
      message: `Found **${result.total}** workers${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}. Returned ${workers.length} results.`
    };
  })
  .build();
