import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNoteComments = SlateTool.create(spec, {
  name: 'Get Note Comments',
  key: 'get_note_comments',
  description:
    'Read a page of comments on a Matterport note, including comment IDs, text, authors, and timestamps. Use nextOffset to retrieve subsequent pages.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      modelId: z.string().describe('The Matterport model ID'),
      noteId: z.string().describe('The note ID returned by Get Notes'),
      offset: z.string().optional().describe('The nextOffset returned by the previous page'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Number of comments requested per page')
    })
  )
  .output(
    z.object({
      nextOffset: z.string().nullable(),
      comments: z.array(
        z.object({
          commentId: z.string(),
          text: z.string().nullable(),
          created: z.string(),
          modified: z.string(),
          edited: z.boolean(),
          createdBy: z.object({
            userId: z.string(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            email: z.string().nullable()
          })
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getNoteComments(
      ctx.input.modelId,
      ctx.input.noteId,
      { offset: ctx.input.offset, pageSize: ctx.input.pageSize }
    );
    return {
      output: {
        nextOffset: result.nextOffset ?? null,
        comments: result.results.map((comment: any) => ({
          commentId: comment.id,
          text: comment.text ?? null,
          created: comment.created,
          modified: comment.modified,
          edited: comment.edited,
          createdBy: {
            userId: comment.createdBy.id,
            firstName: comment.createdBy.firstName ?? null,
            lastName: comment.createdBy.lastName ?? null,
            email: comment.createdBy.email ?? null
          }
        }))
      },
      message: `Retrieved ${result.results.length} comments.`
    };
  })
  .build();
