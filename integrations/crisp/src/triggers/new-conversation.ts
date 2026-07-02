import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newConversation = SlateTrigger.create(spec, {
  name: 'New Conversation',
  key: 'new_conversation',
  description: 'Triggers when a new conversation is created in the Crisp workspace.'
})
  .input(
    z.object({
      sessionId: z.string(),
      state: z.string().optional(),
      nickname: z.string().optional(),
      email: z.string().optional(),
      subject: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session ID of the new conversation'),
      state: z.string().optional().describe('Conversation state'),
      nickname: z.string().optional().describe('Visitor nickname'),
      email: z.string().optional().describe('Visitor email'),
      subject: z.string().optional().describe('Conversation subject'),
      createdAt: z.string().optional().describe('When the conversation was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });

      let conversations = await client.listConversations({
        pageNumber: 1,
        orderDateCreated: 'desc'
      });

      let lastSeenTimestamp = ctx.state?.lastSeenTimestamp as string | undefined;
      let inputs: any[] = [];

      for (let c of conversations || []) {
        let createdAt = c.created_at ? String(c.created_at) : undefined;

        if (lastSeenTimestamp && createdAt && createdAt <= lastSeenTimestamp) {
          break;
        }

        inputs.push({
          sessionId: c.session_id,
          state: c.state,
          nickname: c.meta?.nickname,
          email: c.meta?.email,
          subject: c.meta?.subject,
          createdAt
        });
      }

      let newTimestamp = conversations?.[0]?.created_at
        ? String(conversations[0].created_at)
        : lastSeenTimestamp;

      return {
        inputs,
        updatedState: {
          lastSeenTimestamp: newTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'conversation.created',
        id: ctx.input.sessionId,
        output: {
          sessionId: ctx.input.sessionId,
          state: ctx.input.state,
          nickname: ctx.input.nickname,
          email: ctx.input.email,
          subject: ctx.input.subject,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
