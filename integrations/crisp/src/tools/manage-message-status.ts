import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { crispServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageMessageStatus = SlateTool.create(spec, {
  name: 'Manage Message Status',
  key: 'manage_message_status',
  description: `Mark Crisp conversation messages as read, unread, or delivered. Use message fingerprints from Get Messages or Send Message for fingerprint-specific acknowledgements.`,
  instructions: [
    'For mark_read, fingerprints are optional; omit them to mark the whole conversation read for the selected sender side.',
    'For mark_unread, Crisp marks the user side unread and does not accept fingerprints.',
    'For mark_delivered, provide one or more operator message fingerprints.'
  ]
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID of the conversation'),
      action: z
        .enum(['mark_read', 'mark_unread', 'mark_delivered'])
        .describe('Message status action to perform'),
      from: z
        .enum(['user', 'operator'])
        .optional()
        .default('user')
        .describe(
          'Sender side for mark_read. mark_unread uses user; mark_delivered uses operator.'
        ),
      origin: z
        .string()
        .optional()
        .default('chat')
        .describe('Message origin for mark_read or mark_delivered'),
      fingerprints: z
        .array(z.number())
        .optional()
        .describe('Message fingerprints for mark_read or mark_delivered')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Session ID of the updated conversation'),
      action: z.enum(['mark_read', 'mark_unread', 'mark_delivered']),
      fingerprintCount: z.number().describe('Number of fingerprints supplied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let fingerprints = ctx.input.fingerprints ?? [];

    if (ctx.input.action === 'mark_unread') {
      if (fingerprints.length > 0) {
        throw crispServiceError('fingerprints are not supported for mark_unread.');
      }

      await client.markConversationUnread(ctx.input.sessionId, 'user');
    } else if (ctx.input.action === 'mark_delivered') {
      if (fingerprints.length === 0) {
        throw crispServiceError('Provide at least one fingerprint for mark_delivered.');
      }

      await client.markMessagesDelivered(
        ctx.input.sessionId,
        'operator',
        ctx.input.origin,
        fingerprints
      );
    } else {
      await client.markMessagesRead(
        ctx.input.sessionId,
        ctx.input.from,
        ctx.input.origin,
        fingerprints.length > 0 ? fingerprints : undefined
      );
    }

    return {
      output: {
        sessionId: ctx.input.sessionId,
        action: ctx.input.action,
        fingerprintCount: fingerprints.length
      },
      message: `Applied **${ctx.input.action}** to conversation **${ctx.input.sessionId}**.`
    };
  })
  .build();
