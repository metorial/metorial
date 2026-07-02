import { SlateTool } from 'slates';
import { z } from 'zod';
import { PhotoshopClient } from '../lib/photoshop';
import { spec } from '../spec';

let storageRefSchema = z.object({
  href: z.string().describe('URL or path to the file (pre-signed URL for cloud storage)'),
  storage: z.enum(['external', 'azure', 'dropbox']).describe('Storage type for the file')
});

export let removeBackground = SlateTool.create(spec, {
  name: 'Remove Background',
  key: 'remove_background',
  description: `Remove the background from an image using Adobe Photoshop AI. Accepts images from cloud storage (S3 pre-signed URLs, Azure Blob Storage, or Dropbox) and outputs the result to cloud storage. The operation is asynchronous — a job ID and status URL are returned.`,
  instructions: [
    'Input and output images must be hosted on supported cloud storage (S3, Azure, Dropbox) with appropriate pre-signed URLs.',
    'Poll the status URL to check when the job completes.'
  ]
})
  .input(
    z.object({
      input: storageRefSchema.describe('Input image location'),
      output: storageRefSchema.describe('Output image location')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Async job identifier'),
      status: z.string().describe('Job status (e.g. pending, running, succeeded, failed)'),
      statusUrl: z.string().optional().describe('URL to poll for job completion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PhotoshopClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let result = await client.removeBackground(ctx.input.input, ctx.input.output);

    return {
      output: {
        jobId: result.jobId || result.links?.self?.href?.split('/').pop(),
        status: result.status || 'submitted',
        statusUrl: result.links?.self?.href
      },
      message: `Background removal job submitted. Status: **${result.status || 'submitted'}**.`
    };
  })
  .build();
