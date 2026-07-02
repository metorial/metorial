import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let jobCompleted = SlateTrigger.create(spec, {
  name: 'Job Completed',
  key: 'job_completed',
  description:
    'Triggers when an image processing job completes. Configure the webhook URL in each processing request via the webhooks.complete parameter, or contact Deep Image support to set a default webhook URL on your account.'
})
  .input(
    z.object({
      jobId: z.string().describe('Job identifier'),
      resultUrl: z.string().describe('URL to the processed image'),
      requestData: z.any().optional().describe('Original processing request data')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Completed job identifier'),
      resultUrl: z.string().describe('URL to the processed image'),
      requestData: z.any().optional().describe('Original processing request data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as {
        job: string;
        result_url: string;
        data: unknown;
      };

      return {
        inputs: [
          {
            jobId: data.job,
            resultUrl: data.result_url,
            requestData: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'job.completed',
        id: ctx.input.jobId,
        output: {
          jobId: ctx.input.jobId,
          resultUrl: ctx.input.resultUrl,
          requestData: ctx.input.requestData
        }
      };
    }
  })
  .build();
