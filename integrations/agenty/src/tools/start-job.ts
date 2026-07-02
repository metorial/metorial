import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startJob = SlateTool.create(spec, {
  name: 'Start Job',
  key: 'start_job',
  description: `Start a new scraping, crawling, or monitoring job for a given agent. The job runs asynchronously in the background. Returns the job ID for tracking progress and retrieving results.`,
  instructions: [
    'After starting a job, use the "Get Job Status" tool to monitor progress, or configure a webhook for automatic notification on completion.'
  ]
})
  .input(
    z.object({
      agentId: z.string().describe('The ID of the agent to run.')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique identifier for the started job.'),
      agentId: z.string().describe('Agent ID the job belongs to.'),
      status: z.string().describe('Current job status (e.g. "running", "queued").'),
      createdAt: z
        .string()
        .optional()
        .nullable()
        .describe('ISO 8601 timestamp when the job was created.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.startJob(ctx.input.agentId);

    return {
      output: {
        jobId: result.job_id,
        agentId: result.agent_id || ctx.input.agentId,
        status: result.status,
        createdAt: result.created_at
      },
      message: `Started job **${result.job_id}** for agent **${ctx.input.agentId}**. Status: ${result.status}.`
    };
  })
  .build();
