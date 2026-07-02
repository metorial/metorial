import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let workflowChanges = SlateTrigger.create(spec, {
  name: 'Workflow Changes',
  key: 'workflow_changes',
  description:
    'Detects when workflows are created, updated, activated, or deactivated by polling the n8n instance.'
})
  .input(
    z.object({
      workflowId: z.string().describe('Workflow ID'),
      name: z.string().describe('Workflow name'),
      active: z.boolean().describe('Whether the workflow is active'),
      updatedAt: z.string().describe('Last update timestamp'),
      createdAt: z.string().describe('Creation timestamp'),
      changeType: z
        .enum(['created', 'updated', 'activated', 'deactivated'])
        .describe('Type of change detected')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('Workflow ID'),
      name: z.string().describe('Workflow name'),
      active: z.boolean().describe('Whether the workflow is currently active'),
      updatedAt: z.string().describe('Last update timestamp'),
      createdAt: z.string().describe('Creation timestamp')
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

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let previousWorkflows = (ctx.state?.workflows || {}) as Record<
        string,
        { updatedAt: string; active: boolean }
      >;

      let allWorkflows: any[] = [];
      let cursor: string | undefined;

      // Fetch all workflows (paginated)
      do {
        let result = await client.listWorkflows({
          limit: 100,
          cursor,
          excludePinnedData: true
        });
        allWorkflows = allWorkflows.concat(result.data || []);
        cursor = result.nextCursor;
      } while (cursor);

      let inputs: any[] = [];
      let newWorkflowState: Record<string, { updatedAt: string; active: boolean }> = {};

      for (let w of allWorkflows) {
        let wId = String(w.id);
        let prev = previousWorkflows[wId];

        newWorkflowState[wId] = {
          updatedAt: w.updatedAt || '',
          active: w.active ?? false
        };

        // Skip on first poll to avoid flooding with existing workflows
        if (!lastPollTime) continue;

        if (!prev) {
          // New workflow
          inputs.push({
            workflowId: wId,
            name: w.name || '',
            active: w.active ?? false,
            updatedAt: w.updatedAt || '',
            createdAt: w.createdAt || '',
            changeType: 'created' as const
          });
        } else if (prev.active !== (w.active ?? false)) {
          // Activation status changed
          inputs.push({
            workflowId: wId,
            name: w.name || '',
            active: w.active ?? false,
            updatedAt: w.updatedAt || '',
            createdAt: w.createdAt || '',
            changeType: w.active ? 'activated' : 'deactivated'
          });
        } else if (prev.updatedAt !== (w.updatedAt || '')) {
          // Updated
          inputs.push({
            workflowId: wId,
            name: w.name || '',
            active: w.active ?? false,
            updatedAt: w.updatedAt || '',
            createdAt: w.createdAt || '',
            changeType: 'updated' as const
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          workflows: newWorkflowState
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `workflow.${ctx.input.changeType}`,
        id: `${ctx.input.workflowId}-${ctx.input.updatedAt}`,
        output: {
          workflowId: ctx.input.workflowId,
          name: ctx.input.name,
          active: ctx.input.active,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
