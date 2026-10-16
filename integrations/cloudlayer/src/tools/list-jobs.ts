import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { jobOutput, responseItems } from '../lib/responses';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List your document generation jobs, ordered by creation date (newest first). Use startAfterId for cursor pagination. The provider overview and endpoint-specific pagination documentation differ; cursor behavior depends on the API deployment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of jobs to return (provider default 10, max 100)'),
      offset: z
        .number()
        .optional()
        .describe(
          'Legacy pagination offset, forwarded for compatibility. Current endpoint docs describe startAfterId instead.'
        ),
      startAfterId: z
        .string()
        .optional()
        .describe('ID of the last item from the preceding page')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Unique job identifier'),
            status: z.string().describe('Job status'),
            jobType: z.string().optional().describe('Type of job'),
            fileSize: z.number().optional().describe('Output file size in bytes'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            raw: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Provider response details with credentials removed')
          })
        )
        .describe('List of jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listJobs({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      startAfterId: ctx.input.startAfterId
    });

    let items = responseItems(result, 'jobs');
    let mapped = items.map(jobOutput);
    return {
      output: { jobs: mapped },
      message: `Found **${mapped.length}** jobs.`
    };
  })
  .build();
