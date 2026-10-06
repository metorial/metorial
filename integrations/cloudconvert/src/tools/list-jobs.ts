import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { pageInput, perPageInput, tagInput } from '../lib/schemas';
import { spec } from '../spec';
export const listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description:
    'List recent jobs with tasks, status, and an optional exact tag filter. Follow nextPage until absent; jobs normally expire 24 hours after ending, so this is not a complete billing history.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      status: z
        .enum(['waiting', 'processing', 'finished', 'error'])
        .optional()
        .describe(
          'processing, finished, or error. The retained waiting value is unsupported by job-list filtering; omit status to inspect waiting jobs.'
        ),
      tag: tagInput,
      perPage: perPageInput.describe('Results per page, from 1 to 1000.'),
      page: pageInput.describe('Positive page number.')
    })
  )
  .output(
    z.object({
      jobs: z.array(
        z.object({
          jobId: z.string(),
          status: z.string(),
          tag: z.string().optional(),
          taskCount: z.number(),
          createdAt: z.string().optional(),
          endedAt: z.string().optional()
        })
      ),
      totalCount: z
        .number()
        .optional()
        .describe('Present only when supplied by the provider.'),
      currentPage: z.number().optional(),
      nextPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).listJobs(ctx.input);
    return {
      output: {
        jobs: result.data.map(job => ({
          jobId: job.id,
          status: job.status,
          tag: job.tag,
          taskCount: job.tasks.length,
          createdAt: job.created_at,
          endedAt: job.ended_at
        })),
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        nextPage: result.links.next === null ? undefined : result.meta.current_page + 1
      },
      message: `Found ${result.data.length} job(s) on page ${result.meta.current_page}.`
    };
  })
  .build();
