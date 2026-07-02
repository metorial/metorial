import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = [
  'board_created',
  'board_updated',
  'board_deleted',
  'board_configuration_changed'
] as const;

export let boardEventsTrigger = SlateTrigger.create(spec, {
  name: 'Board Events',
  key: 'board_events',
  description:
    'Triggers when a board is created, updated, deleted, or has its configuration changed.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event name.'),
      timestamp: z.number().optional().describe('Event timestamp.'),
      boardId: z.number().describe('The board ID.'),
      boardName: z.string().describe('The board name.'),
      boardType: z.string().optional().describe('The board type (scrum, kanban).')
    })
  )
  .output(
    z.object({
      boardId: z.number().describe('The board ID.'),
      boardName: z.string().describe('The board name.'),
      boardType: z.string().optional().describe('The board type.')
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

      let board = data.board ?? {};

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent ?? '',
            timestamp: data.timestamp,
            boardId: board.id ?? 0,
            boardName: board.name ?? '',
            boardType: board.type
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.webhookEvent;
      let typeMap: Record<string, string> = {
        board_created: 'board.created',
        board_updated: 'board.updated',
        board_deleted: 'board.deleted',
        board_configuration_changed: 'board.configuration_changed'
      };
      let eventType = typeMap[eventName] ?? 'board.updated';

      return {
        type: eventType,
        id: `board-${ctx.input.boardId}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          boardId: ctx.input.boardId,
          boardName: ctx.input.boardName,
          boardType: ctx.input.boardType
        }
      };
    }
  })
  .build();
