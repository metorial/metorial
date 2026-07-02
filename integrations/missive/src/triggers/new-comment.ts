import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newComment = SlateTrigger.create(spec, {
  name: 'New Comment',
  key: 'new_comment',
  description:
    'Triggered when a new comment is added to a conversation. Can be filtered to task-related comments, specific authors, or mentioned users.'
})
  .input(
    z.object({
      ruleId: z.string().describe('Webhook rule ID'),
      conversationId: z.string().optional().describe('Conversation ID'),
      raw: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional().describe('Conversation ID'),
      conversationSubject: z.string().optional().describe('Conversation subject'),
      commentBody: z.string().optional().describe('Comment body text'),
      commentPreview: z.string().optional().describe('Comment preview'),
      authorId: z.string().optional().describe('Comment author user ID'),
      authorName: z.string().optional().describe('Comment author name'),
      authorEmail: z.string().optional().describe('Comment author email'),
      mentionedUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs mentioned in the comment'),
      isTask: z.boolean().optional().describe('Whether the comment is task-related'),
      teamId: z.string().optional().describe('Team ID'),
      organizationId: z.string().optional().describe('Organization ID'),
      sharedLabelIds: z.array(z.string()).optional().describe('Applied shared label IDs'),
      assigneeIds: z.array(z.string()).optional().describe('Assignee user IDs'),
      createdAt: z.number().optional().describe('Comment creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let data = await client.createHook({
        type: 'new_comment',
        url: ctx.input.webhookBaseUrl
      });

      let hookId = data.hooks?.id || data.id;

      return {
        registrationDetails: { hookId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let hookId = (ctx.input.registrationDetails as any)?.hookId;
      if (hookId) {
        try {
          await client.deleteHook(hookId);
        } catch (_e: any) {
          // Hook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            ruleId: data.rule?.id || '',
            conversationId: data.conversation?.id,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.raw;
      let conversation = raw.conversation || {};
      let comment = raw.latest_message || raw.comment || {};

      let commentId = comment.id || `${ctx.input.conversationId}-comment-${Date.now()}`;

      return {
        type: 'comment.created',
        id: commentId,
        output: {
          conversationId: conversation.id,
          conversationSubject: conversation.subject,
          commentBody: comment.body,
          commentPreview: comment.preview,
          authorId: comment.author?.id || comment.from_field?.id,
          authorName: comment.author?.name || comment.from_field?.name,
          authorEmail: comment.author?.email || comment.from_field?.address,
          mentionedUserIds: comment.mentions?.map((m: any) => m.id),
          isTask: comment.is_task,
          teamId: conversation.team?.id,
          organizationId: conversation.organization?.id,
          sharedLabelIds: conversation.shared_labels?.map((l: any) => l.id),
          assigneeIds: conversation.assignees?.map((a: any) => a.id),
          createdAt: comment.created_at
        }
      };
    }
  })
  .build();
