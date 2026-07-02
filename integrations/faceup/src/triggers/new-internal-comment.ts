import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let newInternalComment = SlateTrigger.create(spec, {
  name: 'New Internal Comment',
  key: 'new_internal_comment',
  description:
    'Triggers when an internal comment is added to a case by an investigator or administrator. Configure the webhook in FaceUp admin under Integrations > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the webhook event'),
      commentId: z.string().describe('Unique identifier for the internal comment'),
      commentCreatedAt: z.string().describe('ISO 8601 timestamp of comment creation'),
      authorId: z.string().describe('ID of the comment author'),
      authorName: z.string().describe('Name of the comment author'),
      reportId: z.string().describe('ID of the associated report')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Unique identifier for the internal comment'),
      commentCreatedAt: z
        .string()
        .describe('ISO 8601 timestamp of when the comment was created'),
      authorId: z.string().describe('ID of the user who created the comment'),
      authorName: z.string().describe('Name of the user who created the comment'),
      reportId: z.string().describe('ID of the report this comment belongs to')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body?.event !== 'InternalCommentCreated') {
        return { inputs: [] };
      }

      let author = body.data?.author ?? {};
      let message = body.data?.message ?? {};
      let report = body.data?.report ?? {};

      return {
        inputs: [
          {
            eventType: body.event,
            commentId: message.id ?? '',
            commentCreatedAt: message.created_at ?? '',
            authorId: author.id ?? '',
            authorName: author.name ?? '',
            reportId: report.id ?? ''
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'internal_comment.created',
        id: ctx.input.commentId,
        output: {
          commentId: ctx.input.commentId,
          commentCreatedAt: ctx.input.commentCreatedAt,
          authorId: ctx.input.authorId,
          authorName: ctx.input.authorName,
          reportId: ctx.input.reportId
        }
      };
    }
  })
  .build();
