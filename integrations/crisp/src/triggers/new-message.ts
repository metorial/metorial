import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    'Triggers when a new message is sent or received in any conversation. Polls recently updated conversations and checks for new messages since the last poll.'
})
  .input(
    z.object({
      sessionId: z.string(),
      fingerprint: z.string(),
      type: z.string(),
      from: z.string(),
      origin: z.string().optional(),
      content: z.any(),
      timestamp: z.number(),
      senderNickname: z.string().optional()
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session ID of the conversation'),
      fingerprint: z.string().describe('Unique message fingerprint'),
      type: z.string().describe('Message type (text, note, file, etc.)'),
      from: z.string().describe('Sender: operator or user'),
      origin: z.string().optional().describe('Origin channel'),
      content: z.any().describe('Message content'),
      timestamp: z.number().describe('Message timestamp in milliseconds'),
      senderNickname: z.string().optional().describe('Sender display name')
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

      let lastSeenTimestamp = ctx.state?.lastSeenTimestamp as number | undefined;
      let inputs: any[] = [];
      let newestTimestamp = lastSeenTimestamp || 0;

      for (let c of (conversations || []).slice(0, 10)) {
        try {
          let messages = await client.getMessagesInConversation(c.session_id);

          for (let m of messages || []) {
            if (lastSeenTimestamp && m.timestamp <= lastSeenTimestamp) {
              continue;
            }

            inputs.push({
              sessionId: c.session_id,
              fingerprint: m.fingerprint,
              type: m.type,
              from: m.from,
              origin: m.origin,
              content: m.content,
              timestamp: m.timestamp,
              senderNickname: m.user?.nickname
            });

            if (m.timestamp > newestTimestamp) {
              newestTimestamp = m.timestamp;
            }
          }
        } catch {
          // Skip conversations that can't be read
        }
      }

      return {
        inputs,
        updatedState: {
          lastSeenTimestamp: newestTimestamp || lastSeenTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `message.${ctx.input.from === 'operator' ? 'sent' : 'received'}`,
        id: ctx.input.fingerprint,
        output: {
          sessionId: ctx.input.sessionId,
          fingerprint: ctx.input.fingerprint,
          type: ctx.input.type,
          from: ctx.input.from,
          origin: ctx.input.origin,
          content: ctx.input.content,
          timestamp: ctx.input.timestamp,
          senderNickname: ctx.input.senderNickname
        }
      };
    }
  })
  .build();
