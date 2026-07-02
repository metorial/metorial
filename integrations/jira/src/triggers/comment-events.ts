import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = ['comment_created', 'comment_updated', 'comment_deleted'] as const;

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description: 'Triggers when a comment is created, updated, or deleted on a Jira issue.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event name.'),
      timestamp: z.number().optional().describe('Event timestamp.'),
      commentId: z.string().describe('The comment ID.'),
      issueId: z.string().describe('The issue ID.'),
      issueKey: z.string().describe('The issue key.'),
      commentBody: z.any().optional().describe('The comment body in ADF format.'),
      authorAccountId: z.string().optional().describe('Comment author account ID.'),
      authorDisplayName: z.string().optional().describe('Comment author display name.'),
      created: z.string().optional().describe('Comment creation timestamp.'),
      updated: z.string().optional().describe('Comment last update timestamp.')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('The comment ID.'),
      issueId: z.string().describe('The issue ID.'),
      issueKey: z.string().describe('The issue key.'),
      commentBody: z.any().optional().describe('The comment body in ADF format.'),
      authorAccountId: z.string().optional().describe('Comment author account ID.'),
      authorDisplayName: z.string().optional().describe('Comment author display name.'),
      created: z.string().optional().describe('Comment creation timestamp.'),
      updated: z.string().optional().describe('Comment update timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [...webhookEvents]);

      let webhookIds = (result.webhookRegistrationResult ?? [])
        .filter((r: any) => r.createdWebhookId)
        .map((r: any) => r.createdWebhookId);

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let webhookIds = ctx.input.registrationDetails?.webhookIds ?? [];
      if (webhookIds.length > 0) {
        await client.deleteWebhook(webhookIds);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let comment = data.comment ?? {};
      let issue = data.issue ?? {};

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent ?? '',
            timestamp: data.timestamp,
            commentId: String(comment.id ?? ''),
            issueId: String(issue.id ?? ''),
            issueKey: issue.key ?? '',
            commentBody: comment.body,
            authorAccountId: comment.author?.accountId,
            authorDisplayName: comment.author?.displayName,
            created: comment.created,
            updated: comment.updated
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.webhookEvent;
      let eventType = 'comment.updated';
      if (eventName === 'comment_created') eventType = 'comment.created';
      else if (eventName === 'comment_deleted') eventType = 'comment.deleted';

      return {
        type: eventType,
        id: `${ctx.input.commentId}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          commentId: ctx.input.commentId,
          issueId: ctx.input.issueId,
          issueKey: ctx.input.issueKey,
          commentBody: ctx.input.commentBody,
          authorAccountId: ctx.input.authorAccountId,
          authorDisplayName: ctx.input.authorDisplayName,
          created: ctx.input.created,
          updated: ctx.input.updated
        }
      };
    }
  })
  .build();
