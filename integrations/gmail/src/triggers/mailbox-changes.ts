import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client, parseMessage } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let mailboxChanges = SlateTrigger.create(spec, {
  name: 'Mailbox Changes',
  key: 'mailbox_changes',
  description:
    'Triggers when new messages arrive, messages are deleted, or labels change in the Gmail mailbox. Uses the Gmail history API for efficient incremental sync.'
})
  .scopes(gmailActionScopes.mailboxChanges)
  .input(
    z.object({
      changeType: z
        .enum(['message_added', 'message_deleted', 'labels_added', 'labels_removed'])
        .describe('Type of mailbox change.'),
      historyId: z.string().describe('History record ID.'),
      messageId: z.string().describe('Affected message ID.'),
      threadId: z.string().describe('Thread ID of the affected message.'),
      labelIds: z.array(z.string()).optional().describe('Labels on the message.'),
      changedLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs that were added or removed.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the affected message.'),
      threadId: z.string().describe('Thread ID.'),
      labelIds: z.array(z.string()).describe('Current labels on the message.'),
      changedLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs that changed (for label events).'),
      from: z.string().optional().describe('Sender (for message_added events).'),
      to: z.string().optional().describe('Recipients (for message_added events).'),
      subject: z.string().optional().describe('Subject (for message_added events).'),
      snippet: z.string().optional().describe('Message snippet (for message_added events).'),
      date: z.string().optional().describe('Date (for message_added events).')
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
          // Message may have been deleted between polling and handling
        }
      }

      return {
        type: `message.${ctx.input.changeType}`,
        id: `${ctx.input.historyId}-${ctx.input.messageId}-${ctx.input.changeType}`,
        output
      };
    }
  });
