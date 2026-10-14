import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobCustomFieldsTool = SlateTool.create(spec, {
  name: 'Get Job Custom Fields',
  key: 'get_job_custom_fields',
  description:
    'Read custom field labels, types, values, definition IDs, and modification details for a job. Results are paginated.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      jobId: z
        .string()
        .min(1)
        .describe('Job ID from list_jobs, search_jobs, or get_contact_jobs'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Number of custom fields per page; defaults to 25'),
      recordStartIndex: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Zero-based index of the first record to return')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(z.record(z.string(), z.any()))
        .describe('Job custom fields with their IDs, labels, types, and values'),
      totalCount: z.number().optional().describe('Total number of custom fields'),
      pageSize: z.number().optional().describe('Page size used by the provider'),
      pageStartIndex: z
        .number()
        .optional()
        .describe('First record index returned by the provider')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getJobCustomFields(ctx.input.jobId, {
      pageSize: ctx.input.pageSize,
      recordStartIndex: ctx.input.recordStartIndex
    });
    let customFields = Array.isArray(result) ? result : (result?.items ?? []);
    return {
      output: {
        customFields,
        totalCount: result?.count,
        pageSize: result?.pageSize,
        pageStartIndex: result?.pageStartIndex
      },
      message: `Retrieved **${customFields.length}** custom fields for job **${ctx.input.jobId}**.`
    };
  })
  .build();
