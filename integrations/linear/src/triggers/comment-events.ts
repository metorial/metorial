import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description: 'Triggers when comments on issues are created, updated, or removed in Linear.'
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'remove']).describe('The action that occurred'),
      webhookId: z.string().describe('Delivery ID from the webhook'),
      commentId: z.string().describe('Comment ID'),
      commentData: z.any().describe('Full comment data from webhook payload'),
      updatedFrom: z.any().optional().describe('Previous values for updated fields')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Comment ID'),
      body: z.string().nullable().describe('Comment body in Markdown'),
      url: z.string().nullable().describe('Comment URL'),
      issueId: z.string().nullable().describe('Parent issue ID'),
      issueIdentifier: z.string().nullable().describe('Parent issue identifier'),
      userId: z.string().nullable().describe('Comment author user ID'),
      userName: z.string().nullable().describe('Comment author name'),
      parentCommentId: z
        .string()
        .nullable()
        .describe('Parent comment ID for threaded replies'),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
      previousValues: z.any().nullable().describe('Previous field values (on update)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resourceTypes: ['Comment'],
        allPublicTeams: true
      });

      if (!result.success) {
        throw linearServiceError('Failed to register webhook');
      }

      return {
        registrationDetails: {
          webhookId: result.webhook.id,
          secret: result.webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let deliveryId = ctx.request.headers.get('Linear-Delivery') || body.webhookId || '';
      let eventType = ctx.request.headers.get('Linear-Event') || '';

      if (eventType !== 'Comment' && body.type !== 'Comment') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            action: body.action,
            webhookId: deliveryId,
            commentId: body.data?.id || '',
            commentData: body.data,
            updatedFrom: body.updatedFrom
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.commentData || {};

      return {
        type: `comment.${ctx.input.action}`,
        id: ctx.input.webhookId,
        output: {
          commentId: data.id || ctx.input.commentId,
          body: data.body || null,
          url: data.url || null,
          issueId: data.issueId || data.issue?.id || null,
          issueIdentifier: data.issue?.identifier || null,
          userId: data.userId || data.user?.id || null,
          userName: data.user?.name || null,
          parentCommentId: data.parentId || data.parent?.id || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          previousValues: ctx.input.updatedFrom || null
        }
      };
    }
  })
  .build();
