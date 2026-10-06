import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextCreatedAtTo: z
    .string()
    .optional()
    .describe('Native date boundary for a following page; can omit same-timestamp records.'),
  historyComplete: z.boolean().optional(),
  jobs: z
    .array(
      z.object({
        jobId: z.string().describe('Unique job identifier'),
        type: z.string().optional().describe('Job type'),
        status: z.string().optional().describe('Job status'),
        numSuccess: z.number().optional().describe('Number of successful records'),
        numError: z.number().optional().describe('Number of errored records'),
        numIgnore: z.number().optional().describe('Number of ignored records'),
        startedAt: z.string().optional().describe('Job start time'),
        endedAt: z.string().optional().describe('Job end time'),
        createdAt: z.string().optional().describe('Job creation time'),
        flowId: z.string().optional().describe('Associated flow ID'),
        flowJobId: z.string().optional().describe('Parent flow job ID')
      })
    )
    .describe('List of jobs')
});

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Retrieve jobs from your Celigo account. Jobs represent flow execution state (running, completed, failed) and final stats. Returns up to 1,001 results in descending order by creation time.
Filter by flowId, integrationId, status, date ranges, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flowId: z.string().optional().describe('Filter jobs by flow ID'),
      integrationId: z.string().optional().describe('Filter jobs by integration ID'),
      status: z
        .string()
        .optional()
        .describe('Filter by job status (e.g., running, completed, failed, canceled)'),
      createdAtFrom: z
        .string()
        .optional()
        .describe('Filter jobs created on or after this time (ISO 8601 UTC)'),
      createdAtTo: z
        .string()
        .optional()
        .describe('Filter jobs created on or before this time (ISO 8601 UTC)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('list_jobs', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
