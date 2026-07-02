import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

export let boardActivity = SlateTrigger.create(spec, {
  name: 'Board Activity',
  key: 'board_activity',
  description:
    'Triggers on any activity on a Trello board, including card creation, updates, moves, comments, member changes, list changes, and label modifications.'
})
  .input(
    z.object({
      actionId: z.string().describe('Unique action ID'),
      actionType: z
        .string()
        .describe('Action type (e.g. createCard, updateCard, commentCard)'),
      date: z.string().describe('When the action occurred'),
      memberCreatorId: z
        .string()
        .optional()
        .describe('ID of the member who performed the action'),
      memberCreatorUsername: z.string().optional().describe('Username of the member'),
      memberCreatorFullName: z.string().optional().describe('Full name of the member'),
      boardId: z.string().optional().describe('Board ID'),
      boardName: z.string().optional().describe('Board name'),
      cardId: z.string().optional().describe('Card ID (if action involves a card)'),
      cardName: z.string().optional().describe('Card name'),
      listId: z.string().optional().describe('List ID (if action involves a list)'),
      listName: z.string().optional().describe('List name'),
      actionData: z.any().optional().describe('Raw action data')
    })
  )
  .output(
    z.object({
      actionId: z.string().describe('Unique action ID'),
      actionType: z.string().describe('Action type'),
      date: z.string().describe('When the action occurred'),
      memberCreatorId: z
        .string()
        .optional()
        .describe('ID of the member who performed the action'),
      memberCreatorUsername: z.string().optional().describe('Username of the member'),
      memberCreatorFullName: z.string().optional().describe('Full name of the member'),
      boardId: z.string().optional().describe('Board ID'),
      boardName: z.string().optional().describe('Board name'),
      cardId: z.string().optional().describe('Card ID'),
      cardName: z.string().optional().describe('Card name'),
      listId: z.string().optional().describe('List ID'),
      listName: z.string().optional().describe('List name'),
      oldListId: z.string().optional().describe('Previous list ID (for card moves)'),
      oldListName: z.string().optional().describe('Previous list name (for card moves)'),
      text: z.string().optional().describe('Comment text (for comment actions)'),
      actionData: z.any().optional().describe('Full action data payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

      // Get the authenticated user's member ID to use as the model to watch
      // This will capture events on all boards the user has access to
      let member = await client.getMember('me', 'id');
      let modelId = member.id;

      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        modelId,
        'Slates Board Activity Webhook'
      );

      return {
        registrationDetails: {
          webhookId: webhook.id,
          modelId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      // Trello sends HEAD request to verify the webhook URL - respond with empty inputs
      if (ctx.request.method === 'HEAD') {
        return { inputs: [] };
      }

      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let action = body?.action;
      if (!action) {
        return { inputs: [] };
      }

      let data = action.data || {};

      return {
        inputs: [
          {
            actionId: action.id,
            actionType: action.type,
            date: action.date,
            memberCreatorId: action.idMemberCreator || action.memberCreator?.id,
            memberCreatorUsername: action.memberCreator?.username,
            memberCreatorFullName: action.memberCreator?.fullName,
            boardId: data.board?.id,
            boardName: data.board?.name,
            cardId: data.card?.id,
            cardName: data.card?.name,
            listId: data.list?.id || data.listAfter?.id,
            listName: data.list?.name || data.listAfter?.name,
            actionData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { actionType } = ctx.input;
      let data = ctx.input.actionData || {};

      // Derive the event type from the action type
      let eventType = actionType
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');

      return {
        type: eventType,
        id: ctx.input.actionId,
        output: {
          actionId: ctx.input.actionId,
          actionType: ctx.input.actionType,
          date: ctx.input.date,
          memberCreatorId: ctx.input.memberCreatorId,
          memberCreatorUsername: ctx.input.memberCreatorUsername,
          memberCreatorFullName: ctx.input.memberCreatorFullName,
          boardId: ctx.input.boardId,
          boardName: ctx.input.boardName,
          cardId: ctx.input.cardId,
          cardName: ctx.input.cardName,
          listId: ctx.input.listId,
          listName: ctx.input.listName,
          oldListId: data.listBefore?.id,
          oldListName: data.listBefore?.name,
          text: data.text,
          actionData: data
        }
      };
    }
  })
  .build();
