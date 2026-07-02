import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BlazeMeterClient } from '../lib/client';
import { spec } from '../spec';

export let testRunCompleted = SlateTrigger.create(spec, {
  name: 'Performance Test Run Event',
  key: 'test_run_event',
  description:
    'Triggers when a performance test run (master) changes status. Polls for recently completed, started, or failed test runs across your projects.'
})
  .input(
    z.object({
      masterId: z.number().describe('Master (test run) ID'),
      testId: z.number().optional().describe('Test ID'),
      testName: z.string().optional().describe('Test name'),
      status: z.string().describe('Run status'),
      created: z.number().optional().describe('Creation timestamp'),
      ended: z.number().optional().describe('End timestamp')
    })
  )
  .output(
    z.object({
      masterId: z.number().describe('Master (test run) ID'),
      testId: z.number().optional().describe('Performance test ID'),
      testName: z.string().optional().describe('Test name'),
      status: z.string().describe('Current run status (e.g., ENDED, CREATED, RUNNING)'),
      created: z.number().optional().describe('Creation timestamp'),
      ended: z.number().optional().describe('End timestamp'),
      isCompleted: z.boolean().describe('Whether the run has finished')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BlazeMeterClient({
        token: ctx.auth.token,
        apiKeyId: ctx.auth.apiKeyId,
        apiKeySecret: ctx.auth.apiKeySecret
      });

      let state = ctx.state as { lastPollTime?: number; seenMasterIds?: number[] } | null;
      let lastPollTime = state?.lastPollTime || 0;
      let seenMasterIds = state?.seenMasterIds || [];

      let masters = await client.listMasters(undefined, undefined, 50);

      let newInputs: Array<{
        masterId: number;
        testId?: number;
        testName?: string;
        status: string;
        created?: number;
        ended?: number;
      }> = [];

      let updatedSeenIds = [...seenMasterIds];
      let now = Math.floor(Date.now() / 1000);

      for (let master of masters) {
        let isNew = !seenMasterIds.includes(master.id);
        let isUpdated = master.updated && master.updated > lastPollTime;

        if (isNew || isUpdated) {
          newInputs.push({
            masterId: master.id,
            testId: master.testId,
            testName: master.name,
            status: master.status || 'UNKNOWN',
            created: master.created,
            ended: master.ended
          });

          if (!updatedSeenIds.includes(master.id)) {
            updatedSeenIds.push(master.id);
          }
        }
      }

      // Keep only the last 500 seen IDs to prevent unbounded growth
      if (updatedSeenIds.length > 500) {
        updatedSeenIds = updatedSeenIds.slice(-500);
      }

      return {
        inputs: newInputs,
        updatedState: {
          lastPollTime: now,
          seenMasterIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let status = ctx.input.status.toUpperCase();
      let eventType =
        status === 'ENDED'
          ? 'test_run.completed'
          : status === 'CREATED'
            ? 'test_run.started'
            : status === 'ERROR' || status === 'FAILED'
              ? 'test_run.failed'
              : `test_run.${status.toLowerCase()}`;

      let isCompleted = ['ENDED', 'ERROR', 'FAILED', 'TERMINATED'].includes(status);

      return {
        type: eventType,
        id: `master-${ctx.input.masterId}-${ctx.input.status}`,
        output: {
          masterId: ctx.input.masterId,
          testId: ctx.input.testId,
          testName: ctx.input.testName,
          status: ctx.input.status,
          created: ctx.input.created,
          ended: ctx.input.ended,
          isCompleted
        }
      };
    }
  })
  .build();
