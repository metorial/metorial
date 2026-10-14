import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { asOptionalString, createClient } from '../lib/helpers';
import { businessIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listBulkJobs = SlateTool.create(spec, {
  name: 'List Bulk Jobs',
  key: 'list_bulk_jobs',
  description:
    'Find bulk sending job IDs, template hashes, creation status, and document counts with pagination. Call list_businesses to discover the businessId.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      businessId: businessIdSchema,
      limit: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Maximum jobs to return; default 100'),
      offset: z.number().int().min(0).optional().describe('Number of jobs to skip')
    })
  )
  .output(
    z.object({
      jobs: z.array(
        z.object({
          bulkJobId: z.string(),
          templateHash: z.string(),
          documentCount: z.number(),
          status: z.string(),
          createdAt: z.string().optional(),
          title: z.string().optional()
        })
      ),
      pagination: z.object({
        limit: z.number(),
        offset: z.number(),
        count: z.number(),
        total: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx.config, ctx.auth, ctx.input.businessId).listBulkJobs(
      ctx.input.limit,
      ctx.input.offset
    );
    if (!Array.isArray(result?.data) || !result.pagination) {
      throw createApiServiceError('Eversign did not return a bulk job list with pagination.');
    }
    let jobs = result.data.map((job: any) => ({
      bulkJobId: String(job.entry_id),
      templateHash: job.template_hash,
      documentCount: job.document_count,
      status: job.status,
      createdAt: asOptionalString(job.created_at),
      title: job.document_title || undefined
    }));
    return {
      output: { jobs, pagination: result.pagination },
      message: `Found ${jobs.length} bulk sending job(s).`
    };
  })
  .build();
