import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let goalProgressTrigger = SlateTrigger.create(spec, {
  name: 'Goal Progress',
  key: 'goal_progress',
  description:
    "Polls for changes in coding goal status. Triggers when a goal's status changes (e.g., from pending to success or fail), enabling notifications and automations based on goal achievement."
})
  .input(
    z.object({
      goalId: z.string().describe('Goal ID'),
      title: z.string().describe('Goal title'),
      currentStatus: z.string().describe('Current goal status'),
      previousStatus: z.string().optional().describe('Previous goal status'),
      statusPercent: z.number().optional().describe('Progress percentage'),
      targetSeconds: z.number().describe('Target seconds'),
      frequency: z.string().optional().describe('Goal frequency')
    })
  )
  .output(
    z.object({
      goalId: z.string().describe('Unique goal ID'),
      title: z.string().describe('Goal title'),
      currentStatus: z
        .string()
        .describe('Current goal status (success, fail, pending, ignored)'),
      previousStatus: z
        .string()
        .optional()
        .describe('Previous goal status before this change'),
      statusPercent: z.number().optional().describe('Current progress as a percentage'),
      targetSeconds: z.number().describe('Target number of seconds'),
      frequency: z.string().optional().describe('Goal frequency (daily, weekly)')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new WakaTimeClient({ token: ctx.auth.token });

      let goals = await client.getGoals();

      let previousStatuses: Record<string, string> = (ctx.state as any)?.goalStatuses ?? {};

      let inputs: Array<{
        goalId: string;
        title: string;
        currentStatus: string;
        previousStatus?: string;
        statusPercent?: number;
        targetSeconds: number;
        frequency?: string;
      }> = [];

      let newStatuses: Record<string, string> = {};

      for (let goal of goals || []) {
        let goalId = goal.id ?? '';
        let currentStatus = goal.status ?? 'pending';
        newStatuses[goalId] = currentStatus;

        let previousStatus = previousStatuses[goalId];

        // Trigger if status changed or if this is a new goal we haven't seen before
        if (previousStatus !== undefined && previousStatus !== currentStatus) {
          inputs.push({
            goalId,
            title: goal.title ?? '',
            currentStatus,
            previousStatus,
            statusPercent: goal.status_percent,
            targetSeconds: goal.seconds ?? 0,
            frequency: goal.frequency
          });
        }
      }

      return {
        inputs,
        updatedState: {
          goalStatuses: newStatuses
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `goal.${ctx.input.currentStatus}`,
        id: `${ctx.input.goalId}-${ctx.input.currentStatus}-${Date.now()}`,
        output: {
          goalId: ctx.input.goalId,
          title: ctx.input.title,
          currentStatus: ctx.input.currentStatus,
          previousStatus: ctx.input.previousStatus,
          statusPercent: ctx.input.statusPercent,
          targetSeconds: ctx.input.targetSeconds,
          frequency: ctx.input.frequency
        }
      };
    }
  })
  .build();
