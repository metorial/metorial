import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let conversationStateChanged = SlateTrigger.create(spec, {
  name: 'Conversation State Changed',
  key: 'conversation_state_changed',
  description:
    'Triggers when a conversation changes state (e.g., resolved, unresolved, pending). Polls for recently updated conversations and detects state changes.'
})
  .input(
    z.object({
      sessionId: z.string(),
      state: z.string(),
      nickname: z.string().optional(),
      email: z.string().optional(),
      updatedAt: z.string()
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session ID of the conversation'),
      state: z.string().describe('New conversation state: pending, unresolved, or resolved'),
      nickname: z.string().optional().describe('Visitor nickname'),
      email: z.string().optional().describe('Visitor email'),
      updatedAt: z.string().describe('When the conversation was last updated')
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
        orderDateUpdated: 'desc'
      });

      let lastSeenTimestamp = ctx.state?.lastSeenTimestamp as string | undefined;
      let knownStates = (ctx.state?.knownStates || {}) as Record<string, string>;
      let inputs: any[] = [];
      let updatedKnownStates: Record<string, string> = { ...knownStates };

      for (let c of conversations || []) {
        let updatedAt = c.updated_at ? String(c.updated_at) : undefined;

        if (lastSeenTimestamp && updatedAt && updatedAt <= lastSeenTimestamp) {
          break;
        }

        let previousState = knownStates[c.session_id];
        if (previousState !== undefined && previousState !== c.state) {
          inputs.push({
            sessionId: c.session_id,
            state: c.state,
            nickname: c.meta?.nickname,
            email: c.meta?.email,
            updatedAt: updatedAt || ''
          });
        }

        updatedKnownStates[c.session_id] = c.state;
      }

      let newTimestamp = conversations?.[0]?.updated_at
        ? String(conversations[0].updated_at)
        : lastSeenTimestamp;

      return {
        inputs,
        updatedState: {
          lastSeenTimestamp: newTimestamp,
          knownStates: updatedKnownStates
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `conversation.${ctx.input.state}`,
        id: `${ctx.input.sessionId}-${ctx.input.updatedAt}`,
        output: {
          sessionId: ctx.input.sessionId,
          state: ctx.input.state,
          nickname: ctx.input.nickname,
          email: ctx.input.email,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
