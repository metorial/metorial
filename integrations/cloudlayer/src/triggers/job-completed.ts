import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let jobCompleted = SlateTrigger.create(spec, {
  name: 'Job Completed',
  key: 'job_completed',
  description:
    'Triggers when a document generation job completes with either a success or error status. Webhook URL must be provided in the generation request.'
})
  .input(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      status: z.enum(['success', 'error']).describe('Job completion status'),
      assetUrl: z.string().optional().describe('URL to the generated asset (on success)'),
      previewUrl: z.string().optional().describe('URL to the preview image (if enabled)'),
      errorMessage: z.string().optional().describe('Error description (on failure)'),
      timestamp: z.string().optional().describe('ISO 8601 completion timestamp')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      status: z.string().describe('Job completion status (success or error)'),
      assetUrl: z.string().optional().describe('URL to the generated asset'),
      previewUrl: z.string().optional().describe('URL to the preview image'),
      errorMessage: z.string().optional().describe('Error description if the job failed'),
      completedAt: z.string().optional().describe('ISO 8601 completion timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      return {
        inputs: [
          {
            jobId: (data.jobId ?? '') as string,
            status: (data.status === 'error' ? 'error' : 'success') as 'success' | 'error',
            assetUrl: data.assetUrl as string | undefined,
            previewUrl: data.previewUrl as string | undefined,
            errorMessage: data.error as string | undefined,
            timestamp: data.timestamp as string | undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `job.${ctx.input.status}`,
        id: ctx.input.jobId,
        output: {
          jobId: ctx.input.jobId,
          status: ctx.input.status,
          assetUrl: ctx.input.assetUrl,
          previewUrl: ctx.input.previewUrl,
          errorMessage: ctx.input.errorMessage,
          completedAt: ctx.input.timestamp
        }
      };
    }
  })
  .build();
