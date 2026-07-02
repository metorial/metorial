import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description: 'Triggers when comments on issues are created, updated, or deleted.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event type'),
      timestamp: z.number().optional().describe('Event timestamp'),
      commentId: z.string().describe('Comment ID'),
      commentBody: z.string().optional().describe('Comment body text'),
      issueId: z.string().describe('Issue ID the comment belongs to'),
      issueKey: z.string().describe('Issue key the comment belongs to'),
      authorAccountId: z.string().optional().describe('Account ID of the comment author'),
      authorName: z.string().optional().describe('Display name of the comment author'),
      created: z.string().optional().describe('Comment creation timestamp'),
      updated: z.string().optional().describe('Comment update timestamp')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Comment ID'),
      commentBody: z.string().optional().describe('Comment body text'),
      issueId: z.string().describe('Issue ID the comment belongs to'),
      issueKey: z.string().describe('Issue key the comment belongs to'),
      authorAccountId: z.string().optional().describe('Account ID of the comment author'),
      authorName: z.string().optional().describe('Display name of the comment author'),
      created: z.string().optional().describe('Comment creation timestamp'),
      updated: z.string().optional().describe('Comment update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [
        'comment_created',
        'comment_updated',
        'comment_deleted'
      ]);

      let webhookIds = (result.webhookRegistrationResult || [])
        .filter((r: any) => r.createdWebhookId)
        .map((r: any) => r.createdWebhookId);

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId
      });

      if (ctx.input.registrationDetails?.webhookIds?.length) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookIds);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let comment = data.comment || {};
      let issue = data.issue || {};

      let bodyText = '';
      if (comment.body) {
        if (typeof comment.body === 'string') {
          bodyText = comment.body;
        } else if (comment.body?.content) {
          bodyText = extractTextFromAdf(comment.body);
        }
      }

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent || 'comment_updated',
            timestamp: data.timestamp,
            commentId: comment.id,
            commentBody: bodyText,
            issueId: issue.id,
            issueKey: issue.key,
            authorAccountId: comment.author?.accountId,
            authorName: comment.author?.displayName,
            created: comment.created,
            updated: comment.updated
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'comment.updated';
      if (ctx.input.webhookEvent.includes('created')) {
        eventType = 'comment.created';
      } else if (ctx.input.webhookEvent.includes('deleted')) {
        eventType = 'comment.deleted';
      }

      return {
        type: eventType,
        id: `${ctx.input.commentId}-${ctx.input.timestamp || Date.now()}`,
        output: {
          commentId: ctx.input.commentId,
          commentBody: ctx.input.commentBody,
          issueId: ctx.input.issueId,
          issueKey: ctx.input.issueKey,
          authorAccountId: ctx.input.authorAccountId,
          authorName: ctx.input.authorName,
          created: ctx.input.created,
          updated: ctx.input.updated
        }
      };
    }
  })
  .build();

let extractTextFromAdf = (adf: any): string => {
  if (!adf?.content) return '';
  let texts: string[] = [];
  let walk = (nodes: any[]) => {
    for (let node of nodes) {
      if (node.type === 'text' && node.text) {
        texts.push(node.text);
      }
      if (node.content) {
        walk(node.content);
      }
    }
  };
  walk(adf.content);
  return texts.join(' ');
};
