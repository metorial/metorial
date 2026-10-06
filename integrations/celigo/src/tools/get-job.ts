import { SlateTool } from 'slates';
import { z } from 'zod';
import { invoke } from '../lib/invocation';
import { fail } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  files: z
    .array(z.any())
    .optional()
    .describe('Native job file references; use their id for download_job_file.'),
  jobId: z.string().describe('Unique job identifier'),
  type: z.string().optional().describe('Job type'),
  status: z.string().optional().describe('Job status'),
  numSuccess: z.number().optional().describe('Number of successful records'),
  numError: z.number().optional().describe('Number of errored records'),
  numIgnore: z.number().optional().describe('Number of ignored records'),
  startedAt: z.string().optional().describe('Job start time'),
  endedAt: z.string().optional().describe('Job end time'),
  jobErrors: z.array(z.any()).optional().describe('Job errors, if requested'),
  rawJob: z.any().describe('Credential-filtered native job object')
});

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve one exact job and discover its current file references and execution counters. Use get_flow_errors with the native flow/processor and flowJobId for open record errors.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('ID of the job to retrieve'),
      includeErrors: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Legacy true option is unsupported by the documented current Jobs API. Use get_flow_errors with a native step and flowJobId; no joberrors call will be made.'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke('get_job', ctx);
    const parsed = outputSchema.safeParse(result.output);
    if (!parsed.success)
      throw fail(
        'Celigo returned an invalid result. Reconcile any requested write before repeating it.'
      );
    return { ...result, output: parsed.data };
  })
  .build();
