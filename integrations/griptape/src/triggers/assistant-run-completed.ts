import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assistantRunCompleted = SlateTrigger.create(spec, {
  name: 'Assistant Run Completed',
  key: 'assistant_run_completed',
  description:
    'Triggers when an assistant run reaches a terminal state (succeeded, failed, error, or cancelled).'
})
  .input(
    z.object({
      assistantRunId: z.string().describe('ID of the completed run'),
      assistantId: z.string().describe('ID of the assistant'),
      status: z.string().describe('Terminal status of the run'),
      input: z.string().optional().describe('Input provided to the run'),
      output: z.any().optional().describe('Output of the run'),
      threadId: z.string().optional().describe('Thread ID'),
      createdAt: z.string().describe('When the run was created'),
      completedAt: z.string().optional().describe('When the run completed')
    })
  )
  .output(
    z.object({
      assistantRunId: z.string().describe('ID of the completed run'),
      assistantId: z.string().describe('ID of the assistant'),
      status: z.string().describe('Terminal status of the run'),
      input: z.string().optional().describe('Input provided to the run'),
      output: z.any().optional().describe('Output of the run'),
      threadId: z.string().optional().describe('Thread ID'),
      createdAt: z.string().describe('When the run was created'),
      completedAt: z.string().optional().describe('When the run completed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

      let knownCompletedIds: string[] = ctx.state?.knownCompletedIds ?? [];
      let assistantIds: string[] = ctx.state?.assistantIds ?? [];

      // On first run, fetch all assistants to monitor
      if (assistantIds.length === 0) {
        let assistantsResult = await client.listAssistants({ pageSize: 100 });
        assistantIds = assistantsResult.items.map((a: any) => a.assistant_id);
      }

      let inputs: Array<{
        assistantRunId: string;
        assistantId: string;
        status: string;
        input?: string;
        output?: any;
        threadId?: string;
        createdAt: string;
        completedAt?: string;
      }> = [];

      let newCompletedIds: string[] = [...knownCompletedIds];

      for (let assistantId of assistantIds) {
        try {
          let runsResult = await client.listAssistantRuns(assistantId, {
            pageSize: 20,
            status: ['SUCCEEDED', 'FAILED', 'ERROR', 'CANCELLED']
          });

          for (let run of runsResult.items) {
            if (!knownCompletedIds.includes(run.assistant_run_id)) {
              inputs.push({
                assistantRunId: run.assistant_run_id,
                assistantId: run.assistant_id,
                status: run.status,
                input: run.input,
                output: run.output,
                threadId: run.thread_id,
                createdAt: run.created_at,
                completedAt: run.completed_at
              });
              newCompletedIds.push(run.assistant_run_id);
            }
          }
        } catch {
          // Skip assistants that may have been deleted
        }
      }

      // Keep only the last 500 IDs to prevent state from growing indefinitely
      if (newCompletedIds.length > 500) {
        newCompletedIds = newCompletedIds.slice(-500);
      }

      return {
        inputs,
        updatedState: {
          knownCompletedIds: newCompletedIds,
          assistantIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `assistant_run.${ctx.input.status.toLowerCase()}`,
        id: ctx.input.assistantRunId,
        output: {
          assistantRunId: ctx.input.assistantRunId,
          assistantId: ctx.input.assistantId,
          status: ctx.input.status,
          input: ctx.input.input,
          output: ctx.input.output,
          threadId: ctx.input.threadId,
          createdAt: ctx.input.createdAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
