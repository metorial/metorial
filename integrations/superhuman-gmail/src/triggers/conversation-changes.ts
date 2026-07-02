import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client, parseMessage } from '../lib/client';
import { spec } from '../spec';

export let conversationChanges = SlateTrigger.create(spec, {
  name: 'Conversation Changes',
  key: 'conversation_changes',
  description:
    'Fires when messages are added or removed, or labels change on messages—**grouped by Gmail history**, with **threadId** for conversation-centric workflows. Uses incremental **history** polling (no Pub/Sub setup).'
})
  .input(
    z.object({
      changeType: z
        .enum(['message_added', 'message_deleted', 'labels_added', 'labels_removed'])
        .describe('Kind of mailbox change.'),
      historyId: z.string().describe('History record ID from Gmail.'),
      messageId: z.string().describe('Affected message ID.'),
      threadId: z.string().describe('Thread (conversation) ID.'),
      labelIds: z
        .array(z.string())
        .optional()
        .describe('Labels on the message after the change (when known).'),
      changedLabelIds: z
        .array(z.string())
        .optional()
        .describe('Labels added or removed in this event.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Affected message ID.'),
      threadId: z.string().describe('Conversation thread ID.'),
      labelIds: z.array(z.string()).describe('Current labels on the message when available.'),
      changedLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs that were added or removed.'),
      from: z
        .string()
        .optional()
        .describe('Sender (message_added, when body fetch succeeds).'),
      to: z.string().optional().describe('Recipients (message_added).'),
      subject: z.string().optional().describe('Subject (message_added).'),
      snippet: z.string().optional().describe('Snippet (message_added).'),
      date: z.string().optional().describe('Date header (message_added).')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        userId: ctx.config.userId
      });

      let currentHistoryId = ctx.state?.lastHistoryId as string | undefined;

      if (!currentHistoryId) {
        let profile = await client.getProfile();
        return {
          inputs: [],
          updatedState: {
            lastHistoryId: profile.historyId
          }
        };
      }

      let allInputs: Array<{
        changeType: 'message_added' | 'message_deleted' | 'labels_added' | 'labels_removed';
        historyId: string;
        messageId: string;
        threadId: string;
        labelIds?: string[];
        changedLabelIds?: string[];
      }> = [];

      let pageToken: string | undefined;
      let latestHistoryId = currentHistoryId;

      do {
        let result = await client.listHistory({
          startHistoryId: currentHistoryId,
          historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
          maxResults: 100,
          pageToken
        });

        latestHistoryId = result.historyId;

        for (let record of result.history) {
          if (record.messagesAdded) {
            for (let item of record.messagesAdded) {
              allInputs.push({
                changeType: 'message_added',
                historyId: record.id,
                messageId: item.message.id,
                threadId: item.message.threadId,
                labelIds: item.message.labelIds
              });
            }
          }
          if (record.messagesDeleted) {
            for (let item of record.messagesDeleted) {
              allInputs.push({
                changeType: 'message_deleted',
                historyId: record.id,
                messageId: item.message.id,
                threadId: item.message.threadId,
                labelIds: item.message.labelIds
              });
            }
          }
          if (record.labelsAdded) {
            for (let item of record.labelsAdded) {
              allInputs.push({
                changeType: 'labels_added',
                historyId: record.id,
                messageId: item.message.id,
                threadId: item.message.threadId,
                labelIds: item.message.labelIds,
                changedLabelIds: item.labelIds
              });
            }
          }
          if (record.labelsRemoved) {
            for (let item of record.labelsRemoved) {
              allInputs.push({
                changeType: 'labels_removed',
                historyId: record.id,
                messageId: item.message.id,
                threadId: item.message.threadId,
                labelIds: item.message.labelIds,
                changedLabelIds: item.labelIds
              });
            }
          }
        }

        pageToken = result.nextPageToken;
      } while (pageToken);

      return {
        inputs: allInputs,
        updatedState: {
          lastHistoryId: latestHistoryId
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        userId: ctx.config.userId
      });

      let output: {
        messageId: string;
        threadId: string;
        labelIds: string[];
        changedLabelIds?: string[];
        from?: string;
        to?: string;
        subject?: string;
        snippet?: string;
        date?: string;
      } = {
        messageId: ctx.input.messageId,
        threadId: ctx.input.threadId,
        labelIds: ctx.input.labelIds || [],
        changedLabelIds: ctx.input.changedLabelIds
      };

      if (ctx.input.changeType === 'message_added') {
        try {
          let message = await client.getMessage(ctx.input.messageId);
          let parsed = parseMessage(message);
          output.from = parsed.from;
          output.to = parsed.to;
          output.subject = parsed.subject;
          output.snippet = parsed.snippet;
          output.date = parsed.date;
          output.labelIds = parsed.labelIds;
        } catch {
          // Message may have been removed between poll and handle
        }
      }

      return {
        type: `conversation.${ctx.input.changeType}`,
        id: `${ctx.input.historyId}-${ctx.input.messageId}-${ctx.input.changeType}`,
        output
      };
    }
  });
