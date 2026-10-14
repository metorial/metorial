import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContactJobsTool = SlateTool.create(spec, {
  name: 'Get Contact Jobs',
  key: 'get_contact_jobs',
  description:
    'List jobs associated with an existing contact. Returns job IDs and links that can be used with get_job, together with pagination details.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z
        .string()
        .min(1)
        .describe('Contact ID from list_contacts or search_contacts'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of jobs to return; defaults to 25, maximum 50'),
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
      jobs: z
        .array(z.record(z.string(), z.any()))
        .describe('Job IDs and resource links associated with this contact'),
      totalCount: z.number().optional().describe('Total number of associated jobs'),
      pageSize: z.number().optional().describe('Page size used by the provider'),
      pageStartIndex: z
        .number()
        .optional()
        .describe('First record index returned by the provider')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getContactJobs(ctx.input.contactId, {
      pageSize: ctx.input.pageSize,
      recordStartIndex: ctx.input.recordStartIndex
    });
    let jobs = Array.isArray(result) ? result : (result?.items ?? []);
    return {
      output: {
        jobs,
        totalCount: result?.count,
        pageSize: result?.pageSize,
        pageStartIndex: result?.pageStartIndex
      },
      message: `Retrieved **${jobs.length}** jobs for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
