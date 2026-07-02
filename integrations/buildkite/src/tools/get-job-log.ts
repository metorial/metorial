import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobLog = SlateTool.create(spec, {
  name: 'Get Job Log',
  key: 'get_job_log',
  description: `Retrieve the output log for a specific job in a Buildkite build. Useful for debugging failed builds or inspecting command output. Also supports retrieving job environment variables.`,
  instructions: ['Use the "Get Build" tool first to find the job ID you want to inspect.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pipelineSlug: z.string().describe('Slug of the pipeline'),
      buildNumber: z.number().describe('Build number'),
      jobId: z.string().describe('UUID of the job'),
      includeEnvironment: z
        .boolean()
        .optional()
        .describe('Also fetch the job environment variables')
    })
  )
  .output(
    z.object({
      content: z.string().describe('The log output content'),
      size: z.number().describe('Size of the log in bytes'),
      headerTimes: z.array(z.number()).describe('Timestamps of log section headers'),
      environment: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables for the job, if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let log = await client.getJobLog(
      ctx.input.pipelineSlug,
      ctx.input.buildNumber,
      ctx.input.jobId
    );

    let environment: Record<string, string> | undefined;
    if (ctx.input.includeEnvironment) {
      let envData = await client.getJobEnvironment(
        ctx.input.pipelineSlug,
        ctx.input.buildNumber,
        ctx.input.jobId
      );
      environment = envData.env ?? {};
    }

    return {
      output: {
        content: log.content ?? '',
        size: log.size ?? 0,
        headerTimes: log.header_times ?? [],
        environment
      },
      message: `Retrieved log for job \`${ctx.input.jobId}\` (${log.size ?? 0} bytes).`
    };
  });
