import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let monitorStatusChanged = SlateTrigger.create(spec, {
  name: 'Monitor Status Changed',
  key: 'monitor_status_changed',
  description:
    'Triggers when a monitor detects a status change, such as a new failure, a resolved issue, or a warning condition change.'
})
  .input(
    z.object({
      eventType: z
        .enum(['failing', 'warning', 'resolved'])
        .describe('Type of status change detected'),
      monitorUid: z.string().describe('Unique identifier of the monitor that changed'),
      actionString: z.string().describe('Monitor type and target'),
      lastTransition: z.string().describe('Timestamp of the status transition'),
      lastChecked: z.string().describe('Timestamp of the last check'),
      mxRep: z.string().describe('MX reputation score'),
      failing: z.array(z.string()).describe('Currently failing checks'),
      warnings: z.array(z.string()).describe('Current warnings')
    })
  )
  .output(
    z.object({
      monitorUid: z.string().describe('Unique identifier of the monitor'),
      actionString: z
        .string()
        .describe('Monitor type and target (e.g., "blacklist:example.com")'),
      lastTransition: z.string().describe('Timestamp of the status transition'),
      lastChecked: z.string().describe('Timestamp of the last check'),
      mxRep: z.string().describe('MX reputation score'),
      failing: z.array(z.string()).describe('Currently failing checks'),
      warnings: z.array(z.string()).describe('Current warnings')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);
      let monitors = await client.getMonitors();

      let previousState: Record<
        string,
        { failing: string[]; warnings: string[]; lastTransition: string }
      > = ctx.input.state ?? {};

      let inputs: {
        eventType: 'failing' | 'warning' | 'resolved';
        monitorUid: string;
        actionString: string;
        lastTransition: string;
        lastChecked: string;
        mxRep: string;
        failing: string[];
        warnings: string[];
      }[] = [];

      let newState: Record<
        string,
        { failing: string[]; warnings: string[]; lastTransition: string }
      > = {};

      for (let monitor of monitors) {
        let prev = previousState[monitor.monitorUid];
        newState[monitor.monitorUid] = {
          failing: monitor.failing,
          warnings: monitor.warnings,
          lastTransition: monitor.lastTransition
        };

        if (!prev) {
          continue;
        }

        let prevHadFailures = prev.failing.length > 0;
        let nowHasFailures = monitor.failing.length > 0;
        let prevHadWarnings = prev.warnings.length > 0;
        let nowHasWarnings = monitor.warnings.length > 0;

        let failingChanged =
          JSON.stringify(prev.failing.sort()) !== JSON.stringify([...monitor.failing].sort());
        let warningsChanged =
          JSON.stringify(prev.warnings.sort()) !==
          JSON.stringify([...monitor.warnings].sort());

        if (!failingChanged && !warningsChanged) {
          continue;
        }

        let eventType: 'failing' | 'warning' | 'resolved';
        if (nowHasFailures && failingChanged) {
          eventType = 'failing';
        } else if (prevHadFailures && !nowHasFailures && prevHadWarnings === nowHasWarnings) {
          eventType = 'resolved';
        } else if (nowHasWarnings && warningsChanged && !nowHasFailures) {
          eventType = 'warning';
        } else if (
          !nowHasFailures &&
          !nowHasWarnings &&
          (prevHadFailures || prevHadWarnings)
        ) {
          eventType = 'resolved';
        } else {
          eventType = nowHasFailures ? 'failing' : 'warning';
        }

        inputs.push({
          eventType,
          monitorUid: monitor.monitorUid,
          actionString: monitor.actionString,
          lastTransition: monitor.lastTransition,
          lastChecked: monitor.lastChecked,
          mxRep: monitor.mxRep,
          failing: monitor.failing,
          warnings: monitor.warnings
        });
      }

      return {
        inputs,
        updatedState: newState
      };
    },

    handleEvent: async ctx => {
      return {
        type: `monitor.${ctx.input.eventType}`,
        id: `${ctx.input.monitorUid}-${ctx.input.lastTransition}-${ctx.input.eventType}`,
        output: {
          monitorUid: ctx.input.monitorUid,
          actionString: ctx.input.actionString,
          lastTransition: ctx.input.lastTransition,
          lastChecked: ctx.input.lastChecked,
          mxRep: ctx.input.mxRep,
          failing: ctx.input.failing,
          warnings: ctx.input.warnings
        }
      };
    }
  })
  .build();
