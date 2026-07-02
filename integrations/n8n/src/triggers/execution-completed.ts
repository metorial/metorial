import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let executionCompleted = SlateTrigger.create(spec, {
  name: 'Execution Completed',
  key: 'execution_completed',
  description:
    'Detects when workflow executions complete (successfully or with errors) by polling for new finished executions.'
})
  .input(
    z.object({
      executionId: z.string().describe('Execution ID'),
      workflowId: z.string().describe('Workflow ID'),
      status: z.string().describe('Execution status'),
      startedAt: z.string().optional().describe('Execution start timestamp'),
      stoppedAt: z.string().optional().describe('Execution end timestamp'),
      finished: z.boolean().describe('Whether the execution finished'),
      mode: z.string().optional().describe('Execution mode')
    })
  )
  .output(
    z.object({
      executionId: z.string().describe('Execution ID'),
      workflowId: z.string().describe('ID of the executed workflow'),
      status: z.string().describe('Execution status (success, error, canceled, etc.)'),
      startedAt: z.string().optional().describe('Execution start timestamp'),
      stoppedAt: z.string().optional().describe('Execution end timestamp'),
      mode: z.string().optional().describe('Execution mode (manual, trigger, etc.)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        baseUrl: ctx.config.baseUrl,
        token: ctx.auth.token
      });

      let lastSeenId = ctx.state?.lastSeenId as string | undefined;
      let isFirstPoll = !ctx.state?.initialized;

      // Fetch recent executions
      let result = await client.listExecutions({ limit: 50 });
      let executions = result.data || [];

      let inputs: any[] = [];
      let newLastSeenId = lastSeenId;

      if (isFirstPoll) {
        // On first poll, just store the latest ID to avoid flooding
        if (executions.length > 0) {
          newLastSeenId = String(executions[0].id);
        }
      } else {
        // Collect all new completed executions since last seen
        for (let e of executions) {
          let eId = String(e.id);
          if (eId === lastSeenId) break;

          // Only include finished executions (not running or waiting)
          if (e.status === 'success' || e.status === 'error' || e.status === 'canceled') {
            inputs.push({
              executionId: eId,
              workflowId: e.workflowId ? String(e.workflowId) : '',
              status: e.status,
              startedAt: e.startedAt,
              stoppedAt: e.stoppedAt,
              finished: e.finished ?? true,
              mode: e.mode
            });
          }
        }

        if (executions.length > 0) {
          newLastSeenId = String(executions[0].id);
        }
      }

      return {
        inputs,
        updatedState: {
          lastSeenId: newLastSeenId,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `execution.${ctx.input.status}`,
        id: ctx.input.executionId,
        output: {
          executionId: ctx.input.executionId,
          workflowId: ctx.input.workflowId,
          status: ctx.input.status,
          startedAt: ctx.input.startedAt,
          stoppedAt: ctx.input.stoppedAt,
          mode: ctx.input.mode
        }
      };
    }
  })
  .build();
