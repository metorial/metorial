import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BugherdClient } from '../lib/client';
import { spec } from '../spec';

export let commentCreated = SlateTrigger.create(spec, {
  name: 'Comment Created',
  key: 'comment_created',
  description: 'Fires when a new comment is added to a task in BugHerd.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      commentId: z.number().describe('Comment ID'),
      taskId: z.number().describe('Task ID'),
      projectId: z.number().describe('Project ID'),
      text: z.string().describe('Comment text'),
      userId: z.number().nullable().describe('User ID of the commenter'),
      userEmail: z.string().nullable().describe('Email of the commenter'),
      isPrivate: z.boolean().describe('Whether the comment is private'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Comment ID'),
      taskId: z.number().describe('Task ID the comment was posted on'),
      projectId: z.number().describe('Project ID'),
      text: z.string().describe('Comment text'),
      userId: z.number().nullable().describe('User ID of the commenter'),
      userEmail: z.string().nullable().describe('Commenter email'),
      isPrivate: z.boolean().describe('Whether the comment is private (members only)'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BugherdClient(ctx.auth.token);
      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, 'comment');

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BugherdClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let comment = data.comment ?? data;

      return {
        inputs: [
          {
            eventId: `comment_created_${comment.id}_${Date.now()}`,
            commentId: comment.id,
            taskId: comment.task_id ?? 0,
            projectId: comment.project_id ?? 0,
            text: comment.text ?? '',
            userId: comment.user_id ?? comment.user?.id ?? null,
            userEmail: comment.user?.email ?? null,
            isPrivate: comment.is_private ?? false,
            createdAt: comment.created_at ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'comment.created',
        id: ctx.input.eventId,
        output: {
          commentId: ctx.input.commentId,
          taskId: ctx.input.taskId,
          projectId: ctx.input.projectId,
          text: ctx.input.text,
          userId: ctx.input.userId,
          userEmail: ctx.input.userEmail,
          isPrivate: ctx.input.isPrivate,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
