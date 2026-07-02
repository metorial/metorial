import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let trainingCompleted = SlateTrigger.create(spec, {
  name: 'Training Completed',
  key: 'training_completed',
  description:
    'Triggers when training jobs reach a terminal state (succeeded, failed, or canceled).'
})
  .input(
    z.object({
      trainingId: z.string().describe('Training ID'),
      status: z.string().describe('Terminal status of the training'),
      model: z.string().optional().describe('Base model identifier'),
      version: z.string().optional().describe('Base model version'),
      input: z.any().optional().describe('Training input'),
      output: z.any().optional().describe('Training output (version and weights info)'),
      error: z.string().optional().nullable().describe('Error message if failed'),
      logs: z.string().optional().describe('Training log output'),
      metrics: z.record(z.string(), z.any()).optional().describe('Training metrics'),
      createdAt: z.string().describe('Creation timestamp'),
      startedAt: z.string().optional().nullable().describe('Start timestamp'),
      completedAt: z.string().optional().nullable().describe('Completion timestamp')
    })
  )
  .output(
    z.object({
      trainingId: z.string().describe('Training ID'),
      model: z.string().optional().describe('Base model identifier'),
      version: z.string().optional().describe('Base model version ID'),
      status: z.string().describe('Terminal status: succeeded, failed, canceled, or aborted'),
      input: z.any().optional().describe('Training input parameters'),
      output: z
        .any()
        .optional()
        .describe('Training output (new version info and weights URL)'),
      error: z.string().optional().nullable().describe('Error message if training failed'),
      logs: z.string().optional().describe('Training log output'),
      predictTime: z.number().optional().describe('Prediction time in seconds'),
      totalTime: z.number().optional().describe('Total training time in seconds'),
      createdAt: z.string().describe('When the training was created'),
      startedAt: z.string().optional().nullable().describe('When the training started'),
      completedAt: z.string().optional().nullable().describe('When the training completed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.listTrainings();

      let lastSeenAt = ctx.state?.lastSeenAt as string | undefined;
      let trainings = (result.results || []) as any[];

      let terminalStatuses = ['succeeded', 'failed', 'canceled', 'aborted'];
      let newTrainings = trainings.filter((t: any) => {
        if (!terminalStatuses.includes(t.status)) return false;
        if (!t.completed_at) return false;
        if (lastSeenAt && t.completed_at <= lastSeenAt) return false;
        return true;
      });

      let newestCompletedAt = lastSeenAt;
      for (let t of newTrainings) {
        if (!newestCompletedAt || t.completed_at > newestCompletedAt) {
          newestCompletedAt = t.completed_at;
        }
      }

      return {
        inputs: newTrainings.map((t: any) => ({
          trainingId: t.id,
          status: t.status,
          model: t.model,
          version: t.version,
          input: t.input,
          output: t.output,
          error: t.error,
          logs: t.logs,
          metrics: t.metrics,
          createdAt: t.created_at,
          startedAt: t.started_at,
          completedAt: t.completed_at
        })),
        updatedState: {
          lastSeenAt: newestCompletedAt || lastSeenAt
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `training.${ctx.input.status}`,
        id: ctx.input.trainingId,
        output: {
          trainingId: ctx.input.trainingId,
          model: ctx.input.model,
          version: ctx.input.version,
          status: ctx.input.status,
          input: ctx.input.input,
          output: ctx.input.output,
          error: ctx.input.error,
          logs: ctx.input.logs,
          predictTime: ctx.input.metrics?.predict_time as number | undefined,
          totalTime: ctx.input.metrics?.total_time as number | undefined,
          createdAt: ctx.input.createdAt,
          startedAt: ctx.input.startedAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
