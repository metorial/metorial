import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggered when comments are created or removed on Confluence pages and blog posts.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The type of comment event (comment_created or comment_removed)'),
      commentId: z.string().describe('The comment ID'),
      contentId: z.string().optional().describe('The parent content ID (page or blog post)'),
      timestamp: z.string().describe('When the event occurred'),
      userAccountId: z.string().optional().describe('The user who triggered the event'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('The comment ID'),
      contentId: z.string().optional().describe('The parent content ID'),
      contentTitle: z.string().optional().describe('The parent content title'),
      authorId: z.string().optional().describe('The user who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);

      let result = await client.registerWebhook({
        name: 'Slates Comment Events',
        url: ctx.input.webhookBaseUrl,
        events: ['comment_created', 'comment_removed']
      });

      return {
        registrationDetails: { webhookId: String(result.id || result) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.unregisterWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.eventType || 'unknown';
      let commentId = data.comment?.id || data.id || '';
      let contentId = data.comment?.container?.id || data.content?.id;
      let timestamp = data.timestamp ? String(data.timestamp) : new Date().toISOString();
      let userAccountId = data.userAccountId || data.user?.accountId;

      return {
        inputs: [
          {
            eventType: String(eventType),
            commentId: String(commentId),
            contentId: contentId ? String(contentId) : undefined,
            timestamp,
            userAccountId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: any = {
        commentId: ctx.input.commentId,
        contentId: ctx.input.contentId,
        authorId: ctx.input.userAccountId
      };

      // Try to extract content title from payload
      output.contentTitle =
        ctx.input.rawPayload?.comment?.container?.title ||
        ctx.input.rawPayload?.content?.title;

      return {
        type: `comment.${ctx.input.eventType.replace('comment_', '')}`,
        id: `${ctx.input.commentId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output
      };
    }
  })
  .build();
