import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let serverlessJobCompleted = SlateTrigger.create(spec, {
  name: 'Serverless Job Completed',
  key: 'serverless_job_completed',
  description:
    'Triggered when a Serverless job completes or fails via webhook. To use this trigger, specify the provided webhook URL in the "webhook" field when submitting jobs via /run or /runsync.',
  instructions: [
    'The webhook URL from this trigger must be passed as the "webhook" field in your RunPod job submission payload.',
    'RunPod retries webhook delivery up to 2 times with a 10-second delay if your endpoint does not return 200.'
  ]
})
  .input(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      status: z.string().describe('Final job status: COMPLETED or FAILED'),
      jobOutput: z.any().nullable().describe('Job output data'),
      executionTime: z.number().nullable().describe('Execution time in milliseconds'),
      endpointId: z.string().nullable().describe('Endpoint ID that processed the job'),
      rawPayload: z
        .record(z.string(), z.any())
        .describe('Full raw webhook payload from RunPod')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      status: z.string().describe('Final job status'),
      jobOutput: z.any().nullable().describe('Job output data'),
      executionTime: z.number().nullable().describe('Execution time in milliseconds'),
      endpointId: z.string().nullable().describe('Endpoint ID that processed the job')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            jobId: data.id,
            status: data.status ?? 'UNKNOWN',
            jobOutput: data.output ?? null,
            executionTime: data.executionTime ?? null,
            endpointId: data.endpointId ?? null,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let status = ctx.input.status.toLowerCase();
      let eventType = status === 'failed' ? 'job.failed' : 'job.completed';

      return {
        type: eventType,
        id: ctx.input.jobId,
        output: {
          jobId: ctx.input.jobId,
          status: ctx.input.status,
          jobOutput: ctx.input.jobOutput,
          executionTime: ctx.input.executionTime,
          endpointId: ctx.input.endpointId
        }
      };
    }
  })
  .build();
