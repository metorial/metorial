import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newConversation = SlateTrigger.create(spec, {
  name: 'New Conversation',
  key: 'new_conversation',
  description:
    'Triggers when a new conversation is created with an AI agent across any channel (voice or chat).'
})
  .input(
    z.object({
      conversationId: z.string(),
      contactId: z.string().optional(),
      assistantId: z.string().optional(),
      widgetId: z.string().optional(),
      createdAt: z.string().optional(),
      direction: z.string().optional()
    })
  )
  .output(
    z.object({
      conversationId: z.string(),
      contactId: z.string().optional(),
      assistantId: z.string().optional(),
      widgetId: z.string().optional(),
      createdAt: z.string().optional(),
      direction: z.string().optional()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt;
      let params: { page?: number; size?: number; date_from?: string } = {
        page: 1,
        size: 50
      };
      if (lastPolledAt) {
        params.date_from = lastPolledAt;
      }

      let result = await client.listConversations(params);
      let items = result.data || result.items || result;
      let list = Array.isArray(items) ? items : [];

      let knownIds: string[] = ctx.state?.knownIds || [];
      let newConversations = list.filter((c: any) => !knownIds.includes(c.id));

      let updatedKnownIds = list.map((c: any) => c.id).slice(0, 200);

      return {
        inputs: newConversations.map((c: any) => ({
          conversationId: c.id,
          contactId: c.contact_id,
          assistantId: c.assistant_id,
          widgetId: c.widget_id,
          createdAt: c.created_at,
          direction: c.direction
        })),
        updatedState: {
          lastPolledAt: new Date().toISOString().split('T')[0],
          knownIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'conversation.created',
        id: ctx.input.conversationId,
        output: {
          conversationId: ctx.input.conversationId,
          contactId: ctx.input.contactId,
          assistantId: ctx.input.assistantId,
          widgetId: ctx.input.widgetId,
          createdAt: ctx.input.createdAt,
          direction: ctx.input.direction
        }
      };
    }
  })
  .build();
