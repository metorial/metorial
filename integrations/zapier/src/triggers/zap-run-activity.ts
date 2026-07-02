import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let zapRunActivity = SlateTrigger.create(spec, {
  name: 'Zap Run Activity',
  key: 'zap_run_activity',
  description:
    'Monitors Zap execution history for new runs. Detects completed, failed, and other run events by polling the Zap runs endpoint.'
})
  .input(
    z.object({
      runId: z.string().describe('Unique run identifier'),
      zapId: z.number().describe('Associated Zap ID'),
      zapTitle: z.string().nullable().describe('Zap title'),
      status: z.string().describe('Run status'),
      startTime: z.string().nullable().describe('ISO 8601 start time'),
      endTime: z.string().nullable().describe('ISO 8601 end time'),
      steps: z
        .array(
          z.object({
            status: z.string().nullable(),
            startTime: z.string().nullable()
          })
        )
        .describe('Step execution details'),
      dataIn: z.any().nullable().describe('Trigger input data'),
      dataOut: z.any().nullable().describe('Final output data')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Unique run identifier'),
      zapId: z.number().describe('Associated Zap ID'),
      zapTitle: z.string().nullable().describe('Zap title'),
      status: z.string().describe('Run status (success, error, filtered, etc.)'),
      startTime: z.string().nullable().describe('ISO 8601 start time'),
      endTime: z.string().nullable().describe('ISO 8601 end time'),
      stepCount: z.number().describe('Number of steps in this run'),
      dataIn: z.any().nullable().describe('Trigger input data'),
      dataOut: z.any().nullable().describe('Final output data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let fromDate = lastPollTime || new Date(Date.now() - 30 * 60 * 1000).toISOString();

      let response = await client.getZapRuns({
        fromDate,
        limit: 100
      });

      let newPollTime = new Date().toISOString();

      let inputs = response.data.map(run => ({
        runId: run.id,
        zapId: run.zapId,
        zapTitle: run.zapTitle,
        status: run.status,
        startTime: run.startTime,
        endTime: run.endTime,
        steps: run.steps || [],
        dataIn: run.dataIn,
        dataOut: run.dataOut
      }));

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `zap_run.${ctx.input.status}`,
        id: ctx.input.runId,
        output: {
          runId: ctx.input.runId,
          zapId: ctx.input.zapId,
          zapTitle: ctx.input.zapTitle,
          status: ctx.input.status,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          stepCount: (ctx.input.steps || []).length,
          dataIn: ctx.input.dataIn,
          dataOut: ctx.input.dataOut
        }
      };
    }
  })
  .build();
