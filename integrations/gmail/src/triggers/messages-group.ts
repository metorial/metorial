import {
  buildApiServiceError,
  createApiServiceError,
  getApiErrorStatus,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { Client, type GmailMessage, parseMessage } from '../lib/client';
import { spec } from '../spec';

export let newMessageSchema = z.object({
  messageId: z.string(),
  threadId: z.string(),
  labelIds: z.array(z.string()),
  internalDate: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  snippet: z.string().optional(),
  date: z.string().optional()
});

const lookbackMs = 60 * 60 * 1000;
const maxPages = 10;

export let messagesGroup = triggerGroup(spec, {
  key: 'messages',
  name: 'Gmail Messages',
  description: 'Checks Gmail for messages dated within the past hour.',
  eventSchema: newMessageSchema
})
  .polling({
    intervalSeconds: 15 * 60,
    pollEvents: async ctx => {
      const client = new Client({ token: ctx.auth.token, userId: ctx.config.userId });
      const now = Date.now();
      const since = now - lookbackMs;
      const events: Array<{
        payload: z.infer<typeof newMessageSchema>;
        idempotencyKey: string;
      }> = [];
      let pageToken: string | undefined;
      let pages = 0;

      try {
        do {
          // Gmail supports epoch seconds in after: queries. The time filter keeps
          // each stateless poll bounded while the overlap tolerates scheduling lag.
          const page = await client.listMessages({
            query: `after:${Math.floor(since / 1000)}`,
            includeSpamTrash: true,
            maxResults: 500,
            pageToken
          });
          pages += 1;
          for (const item of page.messages) {
            let message: GmailMessage;
            try {
              message = await client.getMessage(item.id);
            } catch (error) {
              // A message can disappear between list and get.
              if (getApiErrorStatus(error) === 404) continue;
              throw error;
            }
            const createdAt = Number(message.internalDate);
            if (!Number.isFinite(createdAt)) {
              throw createApiServiceError(
                'Gmail returned a message without a valid creation time.',
                {
                  reason: 'gmail_message_creation_time_invalid'
                }
              );
            }
            if (createdAt < since || createdAt > now) continue;
            const parsed = parseMessage(message);
            events.push({
              payload: {
                messageId: parsed.messageId,
                threadId: parsed.threadId,
                labelIds: parsed.labelIds,
                internalDate: parsed.internalDate,
                from: parsed.from,
                to: parsed.to,
                subject: parsed.subject,
                snippet: parsed.snippet,
                date: parsed.date
              },
              idempotencyKey: parsed.messageId
            });
          }
          pageToken = page.nextPageToken;
          if (pageToken && pages >= maxPages) {
            throw createApiServiceError(
              'Gmail returned more recent messages than can be safely scanned in one poll.',
              { reason: 'gmail_recent_message_scan_limit' }
            );
          }
        } while (pageToken);
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Gmail',
          reason: 'gmail_recent_message_scan_failed',
          operation: 'scan recent messages'
        });
      }

      return { events };
    }
  })
  .routingMatchers(async ctx => {
    const client = new Client({ token: ctx.auth.token, userId: ctx.config.userId });
    try {
      const profile = await client.getProfile();
      return [{ emailAddress: profile.emailAddress.toLowerCase() }];
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Gmail',
        reason: 'gmail_mailbox_identity_failed',
        operation: 'identify mailbox for events'
      });
    }
  })
  .build();
