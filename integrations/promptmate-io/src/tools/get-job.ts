import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job',
  description: `Check the status of a Promptmate.io job and retrieve its results if the job has finished. Returns the current status, and when complete, includes the full result data for all processed rows.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Unique identifier of the job to check')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique identifier of the job'),
      jobStatus: z
        .string()
        .describe('Current status of the job (e.g. "queued", "finished", "error")'),
      result: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of result rows, available once the job has finished'),
      responseFields: z
        .array(
          z.object({
            name: z.string().describe('Name of the response field'),
            type: z.string().optional().describe('Type of the response field'),
            description: z.string().optional().describe('Description of the response field')
          })
        )
        .optional()
        .describe('List of response field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.getJobStatus(ctx.input.jobId);

    let rowCount = job.result?.length;
    let statusMsg =
      rowCount !== undefined
        ? `Job **${job.jobId}** is **${job.jobStatus}** with **${rowCount}** result row(s).`
        : `Job **${job.jobId}** is **${job.jobStatus}**.`;

    return {
      output: job,
      message: statusMsg
    };
  })
  .build();
