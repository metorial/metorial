import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let monitorRunCompletedTrigger = SlateTrigger.create(spec, {
  name: 'Monitor Run Completed',
  key: 'monitor_run_completed',
  description:
    'Triggers when a Postman monitor completes a run. Polls monitors and detects new run completions based on the lastRun timestamp.'
})
  .input(
    z.object({
      monitorId: z.string(),
      monitorName: z.string(),
      uid: z.string().optional(),
      lastRunAt: z.string(),
      status: z.string().optional()
    })
  )
  .output(
    z.object({
      monitorId: z.string(),
      monitorName: z.string(),
      uid: z.string().optional(),
      lastRunAt: z.string(),
      status: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let monitors = await client.listMonitors();

      let lastKnownRuns: Record<string, string> = ctx.state?.lastKnownRuns ?? {};
      let inputs: Array<{
        monitorId: string;
        monitorName: string;
        uid?: string;
        lastRunAt: string;
        status?: string;
      }> = [];
      let updatedState: Record<string, string> = {};

      for (let m of monitors) {
        let lastRunTimestamp = m.lastRun?.startedAt ?? m.lastRun?.finishedAt ?? '';
        updatedState[m.id] = lastRunTimestamp;

        let previousRun = lastKnownRuns[m.id];
        if (lastRunTimestamp && previousRun && lastRunTimestamp !== previousRun) {
          inputs.push({
            monitorId: m.id,
            monitorName: m.name,
            uid: m.uid,
            lastRunAt: lastRunTimestamp,
            status: m.lastRun?.status
          });
        }
      }

      return {
        inputs,
        updatedState: { lastKnownRuns: updatedState }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'monitor.run_completed',
        id: `${ctx.input.monitorId}-${ctx.input.lastRunAt}`,
        output: {
          monitorId: ctx.input.monitorId,
          monitorName: ctx.input.monitorName,
          uid: ctx.input.uid,
          lastRunAt: ctx.input.lastRunAt,
          status: ctx.input.status
        }
      };
    }
  })
  .build();
