import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job',
  key: 'get_job',
  description: `Retrieve the details and status of a specific document generation job by its ID. Use this to check whether an asynchronous PDF or image generation job has completed and to get the resulting asset URL.`,
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
      status: z.string().describe('Job status (pending, processing, completed, failed)'),
      jobType: z.string().optional().describe('Type of job (e.g. html/pdf, url/image)'),
      fileSize: z.number().optional().describe('Output file size in bytes'),
      processingTime: z.number().optional().describe('Processing time in milliseconds'),
      creditsUsed: z.number().optional().describe('API credits consumed'),
      assetUrl: z.string().optional().describe('URL to the generated asset'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJob(ctx.input.jobId);

    return {
      output: {
        jobId: result.id ?? result.jobId ?? ctx.input.jobId,
        status: result.status ?? 'unknown',
        jobType: result.type ?? result.jobType,
        fileSize: result.size ?? result.fileSize,
        processingTime: result.processingTime ?? result.duration,
        creditsUsed: result.creditsUsed ?? result.credits,
        assetUrl: result.assetUrl ?? result.url,
        createdAt: result.timestamp ?? result.createdAt
      },
      message: `Job **${ctx.input.jobId}** is **${result.status ?? 'unknown'}**.${result.assetUrl || result.url ? ` Asset URL: ${result.assetUrl ?? result.url}` : ''}`
    };
  })
  .build();
