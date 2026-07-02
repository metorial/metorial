import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { spec } from '../spec';

export let watcherAlertTrigger = SlateTrigger.create(spec, {
  name: 'Watcher Alert',
  key: 'watcher_alert',
  description:
    'Polls the Watcher execution history for new alert executions. Detects when watches fire and reports the watch ID, execution state, and results.'
})
  .input(
    z.object({
      executionId: z.string().describe('Unique execution ID'),
      watchId: z.string().describe('ID of the watch that fired'),
      executionState: z
        .string()
        .describe('State of the execution (executed, throttled, etc.)'),
      triggeredTime: z.string().describe('When the watch was triggered'),
      executionTime: z.string().describe('When the watch was executed'),
      conditionMet: z.boolean().describe('Whether the watch condition was met'),
      actionResults: z
        .record(z.string(), z.any())
        .optional()
        .describe('Results of executed actions'),
      watchInput: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input data that triggered the watch')
    })
  )
  .output(
    z.object({
      watchId: z.string().describe('ID of the watch that fired'),
      executionState: z
        .string()
        .describe('Execution state (executed, throttled, execution_not_needed)'),
      triggeredTime: z.string().describe('Timestamp when the watch was triggered'),
      executionTime: z.string().describe('Timestamp when the watch finished executing'),
      conditionMet: z.boolean().describe('Whether the condition was met'),
      actionResults: z
        .record(z.string(), z.any())
        .optional()
        .describe('Results from actions that were executed'),
      watchInput: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input data from the watch query')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ElasticsearchClient({
        baseUrl: ctx.auth.baseUrl,
        authHeader: ctx.auth.authHeader
      });

      let lastPolledTime = (ctx.state as any)?.lastPolledTime as string | undefined;

      let body: Record<string, any> = {
        sort: [{ 'trigger_event.triggered_time': { order: 'desc' } }],
        size: 100
      };

      if (lastPolledTime) {
        body.query = {
          range: {
            'trigger_event.triggered_time': {
              gt: lastPolledTime
            }
          }
        };
      }

      let result: any;
      try {
        result = await client.getWatchHistory();
        if (lastPolledTime) {
          result = await client.search('.watcher-history-*', body);
        }
      } catch {
        return {
          inputs: [],
          updatedState: ctx.state || {}
        };
      }

      let hits = result?.hits?.hits || [];
      let inputs = hits.map((hit: any) => {
        let source = hit._source || {};
        let triggerEvent = source.trigger_event || {};
        let executionResult = source.result || {};

        return {
          executionId: hit._id || `${source.watch_id}_${triggerEvent.triggered_time || ''}`,
          watchId: source.watch_id || '',
          executionState: source.state || executionResult.execution_state || 'unknown',
          triggeredTime: triggerEvent.triggered_time || '',
          executionTime: source.execution_time || triggerEvent.triggered_time || '',
          conditionMet: executionResult.condition?.met ?? false,
          actionResults: executionResult.actions,
          watchInput: executionResult.input
        };
      });

      let newLastPolledTime = lastPolledTime;
      if (hits.length > 0) {
        let latestTriggeredTime = hits[0]?._source?.trigger_event?.triggered_time;
        if (latestTriggeredTime) {
          newLastPolledTime = latestTriggeredTime;
        }
      }

      return {
        inputs,
        updatedState: {
          lastPolledTime: newLastPolledTime || new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `watch.${ctx.input.executionState}`,
        id: ctx.input.executionId,
        output: {
          watchId: ctx.input.watchId,
          executionState: ctx.input.executionState,
          triggeredTime: ctx.input.triggeredTime,
          executionTime: ctx.input.executionTime,
          conditionMet: ctx.input.conditionMet,
          actionResults: ctx.input.actionResults,
          watchInput: ctx.input.watchInput
        }
      };
    }
  })
  .build();
