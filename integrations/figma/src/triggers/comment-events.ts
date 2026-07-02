import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggers when a comment is added or modified on a Figma file within a team. Includes comment text, mentions, commenter info, and the associated file.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Figma event type (FILE_COMMENT)'),
      webhookId: z.string().optional().describe('ID of the webhook'),
      passcode: z.string().optional().describe('Passcode for verification'),
      timestamp: z.string().optional().describe('Event timestamp'),
      fileKey: z.string().optional().describe('Key of the commented file'),
      fileName: z.string().optional().describe('Name of the commented file'),
      commentId: z.string().optional().describe('ID of the comment'),
      commentText: z.string().optional().describe('Text content of the comment'),
      parentCommentId: z.string().optional().describe('Parent comment ID if this is a reply'),
      orderId: z.string().optional().describe('Order ID for threading'),
      mentions: z
        .array(
          z.object({
            userId: z.string().optional(),
            handle: z.string().optional()
          })
        )
        .optional()
        .describe('Mentioned users'),
      triggeredBy: z
        .object({
          userId: z.string().optional(),
          handle: z.string().optional(),
          imageUrl: z.string().optional()
        })
        .optional()
        .describe('User who posted the comment')
    })
  )
  .output(
    z.object({
      fileKey: z.string().describe('Key of the commented file'),
      fileName: z.string().optional().describe('Name of the commented file'),
      commentId: z.string().describe('ID of the comment'),
      commentText: z.string().optional().describe('Text content of the comment'),
      parentCommentId: z.string().optional().describe('Parent comment ID if this is a reply'),
      timestamp: z.string().optional().describe('When the comment was made'),
      mentions: z
        .array(
          z.object({
            userId: z.string().optional(),
            handle: z.string().optional()
          })
        )
        .optional()
        .describe('Mentioned users'),
      commentedBy: z
        .object({
          userId: z.string().optional(),
          handle: z.string().optional(),
          imageUrl: z.string().optional()
        })
        .optional()
        .describe('User who posted the comment')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FigmaClient(ctx.auth.token);
      let passcode = generatePasscode();

      let webhook = await client.createWebhook({
        eventType: 'FILE_COMMENT',
        teamId: '',
        endpoint: ctx.input.webhookBaseUrl,
        passcode,
        description: 'Slates comment events'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          passcode
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FigmaClient(ctx.auth.token);
      let webhookId = ctx.input.registrationDetails?.webhookId;

      if (webhookId) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.event_type === 'PING') {
        return { inputs: [] };
      }

      let mentions = (data.mentions || []).map((m: any) => ({
        userId: m.id,
        handle: m.handle
      }));

      let triggeredBy: any;
      if (data.triggered_by) {
        triggeredBy = {
          userId: data.triggered_by.id,
          handle: data.triggered_by.handle,
          imageUrl: data.triggered_by.img_url
        };
      }

      // Extract comment details from the payload
      let comment = data.comment || {};

      return {
        inputs: [
          {
            eventType: data.event_type,
            webhookId: data.webhook_id,
            passcode: data.passcode,
            timestamp: data.timestamp,
            fileKey: data.file_key,
            fileName: data.file_name,
            commentId: comment.id || data.comment_id,
            commentText: comment.text || data.comment?.[0]?.text,
            parentCommentId: data.parent_id,
            orderId: data.order_id,
            mentions,
            triggeredBy
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'file.commented',
        id: `FILE_COMMENT-${ctx.input.commentId || ctx.input.fileKey || 'unknown'}-${ctx.input.timestamp || Date.now()}`,
        output: {
          fileKey: ctx.input.fileKey || '',
          fileName: ctx.input.fileName,
          commentId: ctx.input.commentId || '',
          commentText: ctx.input.commentText,
          parentCommentId: ctx.input.parentCommentId,
          timestamp: ctx.input.timestamp,
          mentions: ctx.input.mentions,
          commentedBy: ctx.input.triggeredBy
        }
      };
    }
  })
  .build();

let generatePasscode = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
