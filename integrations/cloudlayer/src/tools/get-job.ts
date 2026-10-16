import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachJobFile } from '../lib/files';
import { jobOutput } from '../lib/responses';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve the details and status of a specific document generation job by its ID. Use this to check whether an asynchronous PDF or image generation job has completed and inspect the provider response. Use retrieve_job_asset after success to download the result.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique job identifier')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      status: z.string().describe('Provider job status, such as pending, success, or error'),
      jobType: z.string().optional().describe('Type of job (e.g. html/pdf, url/image)'),
      fileSize: z.number().optional().describe('Output file size in bytes'),
      processingTime: z.number().optional().describe('Processing time in milliseconds'),
      creditsUsed: z.number().optional().describe('API credits consumed'),
      assetUrl: z.string().optional().describe('URL to the generated asset'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider response details with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJob(ctx.input.jobId);

    let output = jobOutput(result);
    await attachJobFile(ctx, result);
    return {
      output,
      message: `Job **${output.jobId}** has status **${output.status}**.`
    };
  })
  .build();
