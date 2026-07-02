import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = [
  'sprint_created',
  'sprint_updated',
  'sprint_started',
  'sprint_closed',
  'sprint_deleted'
] as const;

export let sprintEventsTrigger = SlateTrigger.create(spec, {
  name: 'Sprint Events',
  key: 'sprint_events',
  description: 'Triggers when a sprint is created, updated, started, closed, or deleted.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event name.'),
      timestamp: z.number().optional().describe('Event timestamp.'),
      sprintId: z.number().describe('The sprint ID.'),
      sprintName: z.string().describe('The sprint name.'),
      sprintState: z
        .string()
        .optional()
        .describe('The sprint state (active, future, closed).'),
      startDate: z.string().optional().describe('Sprint start date.'),
      endDate: z.string().optional().describe('Sprint end date.'),
      completeDate: z.string().optional().describe('Sprint completion date.'),
      goal: z.string().optional().describe('Sprint goal.'),
      boardId: z.number().optional().describe('The board ID.')
    })
  )
  .output(
    z.object({
      sprintId: z.number().describe('The sprint ID.'),
      sprintName: z.string().describe('The sprint name.'),
      sprintState: z.string().optional().describe('The sprint state.'),
      startDate: z.string().optional().describe('Sprint start date.'),
      endDate: z.string().optional().describe('Sprint end date.'),
      completeDate: z.string().optional().describe('Sprint completion date.'),
      goal: z.string().optional().describe('Sprint goal.'),
      boardId: z.number().optional().describe('The board ID.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [...webhookEvents]);

      let webhookIds = (result.webhookRegistrationResult ?? [])
        .filter((r: any) => r.createdWebhookId)
        .map((r: any) => r.createdWebhookId);

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let webhookIds = ctx.input.registrationDetails?.webhookIds ?? [];
      if (webhookIds.length > 0) {
        await client.deleteWebhook(webhookIds);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let sprint = data.sprint ?? {};

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent ?? '',
            timestamp: data.timestamp,
            sprintId: sprint.id ?? 0,
            sprintName: sprint.name ?? '',
            sprintState: sprint.state,
            startDate: sprint.startDate,
            endDate: sprint.endDate,
            completeDate: sprint.completeDate,
            goal: sprint.goal,
            boardId: sprint.originBoardId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.webhookEvent;
      let eventType = 'sprint.updated';
      if (eventName === 'sprint_created') eventType = 'sprint.created';
      else if (eventName === 'sprint_started') eventType = 'sprint.started';
      else if (eventName === 'sprint_closed') eventType = 'sprint.closed';
      else if (eventName === 'sprint_deleted') eventType = 'sprint.deleted';

      return {
        type: eventType,
        id: `sprint-${ctx.input.sprintId}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          sprintId: ctx.input.sprintId,
          sprintName: ctx.input.sprintName,
          sprintState: ctx.input.sprintState,
          startDate: ctx.input.startDate,
          endDate: ctx.input.endDate,
          completeDate: ctx.input.completeDate,
          goal: ctx.input.goal,
          boardId: ctx.input.boardId
        }
      };
    }
  })
  .build();
