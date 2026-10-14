import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStoryComments = SlateTool.create(spec, {
  name: 'List Story Comments',
  key: 'list_story_comments',
  description:
    'Lists story comments with their IDs, authors, timestamps, and thread relationships. Use the comment IDs with manage_story_comments.',
  tags: { readOnly: true }
})
  .input(z.object({ storyId: z.number().int().positive().describe('Public ID of the story') }))
  .output(
    z.object({
      comments: z.array(
        z.object({
          commentId: z.number().describe('ID of the comment'),
          text: z.string().describe('Comment text in Markdown'),
          authorId: z.string().nullable().describe('UUID of the author'),
          parentId: z.number().nullable().describe('Parent comment ID for a reply'),
          appUrl: z.string().describe('URL to view the comment'),
          deleted: z.boolean().describe('Whether the comment was deleted'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listStoryComments(ctx.input.storyId);
    let comments = result.map(
      (comment: {
        id: number;
        text: string;
        author_id: string | null;
        parent_id: number | null;
        app_url: string;
        deleted: boolean;
        created_at: string;
        updated_at: string;
      }) => ({
        commentId: comment.id,
        text: comment.text,
        authorId: comment.author_id ?? null,
        parentId: comment.parent_id ?? null,
        appUrl: comment.app_url,
        deleted: comment.deleted,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      })
    );
    return {
      output: { comments },
      message: `Found **${comments.length}** comments on story ${ctx.input.storyId}`
    };
  })
  .build();
