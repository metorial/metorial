import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let predictionCompleted = SlateTrigger.create(spec, {
  name: 'Prediction Completed',
  key: 'prediction_completed',
  description:
    'Triggers when predictions reach a terminal state (succeeded, failed, or canceled).'
})
  .input(
    z.object({
      predictionId: z.string().describe('Prediction ID'),
      status: z.string().describe('Terminal status of the prediction'),
      model: z.string().optional().describe('Model identifier'),
      version: z.string().optional().describe('Model version'),
      input: z.any().optional().describe('Prediction input'),
      output: z.any().optional().describe('Prediction output'),
      error: z.string().optional().nullable().describe('Error message if failed'),
      logs: z.string().optional().describe('Log output'),
      metrics: z.record(z.string(), z.any()).optional().describe('Prediction metrics'),
      createdAt: z.string().describe('Creation timestamp'),
      startedAt: z.string().optional().nullable().describe('Start timestamp'),
      completedAt: z.string().optional().nullable().describe('Completion timestamp')
    })
  )
  .output(
    z.object({
      predictionId: z.string().describe('Prediction ID'),
      model: z.string().optional().describe('Model identifier (owner/name)'),
      version: z.string().optional().describe('Model version ID'),
      status: z.string().describe('Terminal status: succeeded, failed, or canceled'),
      input: z.any().optional().describe('Input provided to the model'),
      output: z.any().optional().describe('Model output'),
      error: z.string().optional().nullable().describe('Error message if prediction failed'),
      logs: z.string().optional().describe('Log output from the prediction'),
      predictTime: z
        .number()
        .optional()
        .describe('Time spent running the prediction in seconds'),
      totalTime: z.number().optional().describe('Total time including queue time in seconds'),
      createdAt: z.string().describe('When the prediction was created'),
      startedAt: z.string().optional().nullable().describe('When the prediction started'),
      completedAt: z.string().optional().nullable().describe('When the prediction completed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.listPredictions();

      let lastSeenAt = ctx.state?.lastSeenAt as string | undefined;
      let predictions = (result.results || []) as any[];

      // Filter to terminal predictions created after last seen
      let terminalStatuses = ['succeeded', 'failed', 'canceled'];
      let newPredictions = predictions.filter((p: any) => {
        if (!terminalStatuses.includes(p.status)) return false;
        if (!p.completed_at) return false;
        if (lastSeenAt && p.completed_at <= lastSeenAt) return false;
        return true;
      });

      let newestCompletedAt = lastSeenAt;
      for (let p of newPredictions) {
        if (!newestCompletedAt || p.completed_at > newestCompletedAt) {
          newestCompletedAt = p.completed_at;
        }
      }

      return {
        inputs: newPredictions.map((p: any) => ({
          predictionId: p.id,
          status: p.status,
          model: p.model,
          version: p.version,
          input: p.input,
          output: p.output,
          error: p.error,
          logs: p.logs,
          metrics: p.metrics,
          createdAt: p.created_at,
          startedAt: p.started_at,
          completedAt: p.completed_at
        })),
        updatedState: {
          lastSeenAt: newestCompletedAt || lastSeenAt
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `prediction.${ctx.input.status}`,
        id: ctx.input.predictionId,
        output: {
          predictionId: ctx.input.predictionId,
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
