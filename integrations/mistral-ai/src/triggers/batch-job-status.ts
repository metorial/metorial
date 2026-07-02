import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

export let batchJobStatusTrigger = SlateTrigger.create(spec, {
  name: 'Batch Job Status Change',
  key: 'batch_job_status',
  description:
    'Triggers when a batch inference job changes status (e.g., starts running, completes, or fails). Polls the Mistral AI API periodically to detect status changes.'
})
  .input(
    z.object({
      jobId: z.string().describe('Batch job ID'),
      status: z.string().describe('Current job status'),
      previousStatus: z.string().optional().describe('Previous job status'),
      endpoint: z.string().describe('Target API endpoint'),
      model: z.string().nullable().optional().describe('Model used'),
      totalRequests: z.number().optional().describe('Total requests in the batch'),
      succeededRequests: z.number().optional().describe('Number of successful requests'),
      failedRequests: z.number().optional().describe('Number of failed requests'),
      outputFile: z.string().nullable().optional().describe('Output file ID'),
      errorFile: z.string().nullable().optional().describe('Error file ID'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      completedAt: z.number().nullable().optional().describe('Completion timestamp')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Batch job ID'),
      status: z.string().describe('Current job status'),
      previousStatus: z.string().optional().describe('Previous job status'),
      endpoint: z.string().describe('Target API endpoint'),
      model: z.string().nullable().optional().describe('Model used'),
      totalRequests: z.number().optional().describe('Total requests in the batch'),
      succeededRequests: z.number().optional().describe('Number of successful requests'),
      failedRequests: z.number().optional().describe('Number of failed requests'),
      outputFile: z
        .string()
        .nullable()
        .optional()
        .describe('Output file ID (available on completion)'),
      errorFile: z
        .string()
        .nullable()
        .optional()
        .describe('Error file ID (available on failure)'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      completedAt: z.number().nullable().optional().describe('Completion timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MistralClient(ctx.auth.token);

      let result = await client.listBatchJobs({ pageSize: 50 });
      let jobs = result.data || [];

      let previousStatuses: Record<string, string> = ctx.state?.jobStatuses || {};
      let currentStatuses: Record<string, string> = {};
      let inputs: any[] = [];

      for (let job of jobs) {
        currentStatuses[job.id] = job.status;

        let prevStatus = previousStatuses[job.id];
        if (prevStatus && prevStatus !== job.status) {
          inputs.push({
            jobId: job.id,
            status: job.status,
            previousStatus: prevStatus,
            endpoint: job.endpoint,
            model: job.model,
            totalRequests: job.total_requests,
            succeededRequests: job.succeeded_requests,
            failedRequests: job.failed_requests,
            outputFile: job.output_file,
            errorFile: job.error_file,
            createdAt: job.created_at,
            completedAt: job.completed_at
          });
        } else if (!prevStatus) {
          if (job.status !== 'QUEUED') {
            inputs.push({
              jobId: job.id,
              status: job.status,
              previousStatus: undefined,
              endpoint: job.endpoint,
              model: job.model,
              totalRequests: job.total_requests,
              succeededRequests: job.succeeded_requests,
              failedRequests: job.failed_requests,
              outputFile: job.output_file,
              errorFile: job.error_file,
              createdAt: job.created_at,
              completedAt: job.completed_at
            });
          }
          currentStatuses[job.id] = job.status;
        }
      }

      return {
        inputs,
        updatedState: {
          jobStatuses: currentStatuses
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `batch_job.${ctx.input.status.toLowerCase()}`,
        id: `batch-${ctx.input.jobId}-${ctx.input.status}-${ctx.input.completedAt || Date.now()}`,
        output: {
          jobId: ctx.input.jobId,
          status: ctx.input.status,
          previousStatus: ctx.input.previousStatus,
          endpoint: ctx.input.endpoint,
          model: ctx.input.model,
          totalRequests: ctx.input.totalRequests,
          succeededRequests: ctx.input.succeededRequests,
          failedRequests: ctx.input.failedRequests,
          outputFile: ctx.input.outputFile,
          errorFile: ctx.input.errorFile,
          createdAt: ctx.input.createdAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
