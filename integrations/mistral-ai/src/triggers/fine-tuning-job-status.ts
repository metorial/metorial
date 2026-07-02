import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

export let fineTuningJobStatusTrigger = SlateTrigger.create(spec, {
  name: 'Fine-Tuning Job Status Change',
  key: 'fine_tuning_job_status',
  description:
    'Triggers when a fine-tuning job changes status (e.g., starts running, completes, or fails). Polls the Mistral AI API periodically to detect status changes.'
})
  .input(
    z.object({
      jobId: z.string().describe('Fine-tuning job ID'),
      status: z.string().describe('Current job status'),
      previousStatus: z.string().optional().describe('Previous job status'),
      model: z.string().describe('Base model being fine-tuned'),
      fineTunedModel: z
        .string()
        .nullable()
        .optional()
        .describe('Resulting fine-tuned model ID'),
      createdAt: z.number().optional().describe('Job creation timestamp'),
      modifiedAt: z.number().optional().describe('Last modification timestamp')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Fine-tuning job ID'),
      status: z.string().describe('Current job status'),
      previousStatus: z.string().optional().describe('Previous job status'),
      model: z.string().describe('Base model being fine-tuned'),
      fineTunedModel: z
        .string()
        .nullable()
        .optional()
        .describe('Resulting fine-tuned model ID (available when status is SUCCESS)'),
      createdAt: z.number().optional().describe('Job creation timestamp'),
      modifiedAt: z.number().optional().describe('Last modification timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MistralClient(ctx.auth.token);

      let result = await client.listFineTuningJobs({ pageSize: 50 });
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
            model: job.model,
            fineTunedModel: job.fine_tuned_model,
            createdAt: job.created_at,
            modifiedAt: job.modified_at
          });
        } else if (!prevStatus) {
          // New job discovered - only trigger if it's not in initial state
          if (job.status !== 'QUEUED') {
            inputs.push({
              jobId: job.id,
              status: job.status,
              previousStatus: undefined,
              model: job.model,
              fineTunedModel: job.fine_tuned_model,
              createdAt: job.created_at,
              modifiedAt: job.modified_at
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
        type: `fine_tuning_job.${ctx.input.status.toLowerCase()}`,
        id: `ft-${ctx.input.jobId}-${ctx.input.status}-${ctx.input.modifiedAt || Date.now()}`,
        output: {
          jobId: ctx.input.jobId,
          status: ctx.input.status,
          previousStatus: ctx.input.previousStatus,
          model: ctx.input.model,
          fineTunedModel: ctx.input.fineTunedModel,
          createdAt: ctx.input.createdAt,
          modifiedAt: ctx.input.modifiedAt
        }
      };
    }
  })
  .build();
