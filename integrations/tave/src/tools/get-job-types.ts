import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient, textField } from '../lib/client';
import { spec } from '../spec';

export let getJobTypes = SlateTool.create(spec, {
  name: 'Get Job Types',
  key: 'get_job_types',
  description:
    'Lists configured job types with IDs and names for creating jobs and filtering orders or payments. Requires API Key (Public API V2) authentication.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      perPage: z.number().optional().describe('Results per page, from 10 to 100'),
      includeHidden: z.boolean().optional().describe('Include hidden job types'),
      externalMappingId: z.string().optional().describe('Filter by an external mapping ID')
    })
  )
  .output(
    z.object({
      jobTypes: z.array(
        z.object({
          jobTypeId: z.string().describe('Configured job type ID'),
          name: z.string().describe('Configured job type name'),
          hidden: z.boolean().optional().describe('Whether the job type is hidden'),
          raw: z.any().describe('Full job type record')
        })
      ),
      totalCount: z.number().describe('Total number of matching job types'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new TavePublicClient(ctx.auth).listJobTypes(ctx.input);
    let jobTypes = result.items.map(item => ({
      jobTypeId: String(item.id ?? ''),
      name: textField(item, 'name') ?? '',
      hidden: typeof item.hidden === 'boolean' ? item.hidden : undefined,
      raw: item
    }));
    return {
      output: {
        jobTypes,
        totalCount: result.meta.totalItems,
        currentPage: result.meta.currentPage,
        totalPages: result.meta.totalPages
      },
      message: `Retrieved **${jobTypes.length}** job type(s).`
    };
  })
  .build();
