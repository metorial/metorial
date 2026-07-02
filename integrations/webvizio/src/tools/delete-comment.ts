import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Deletes a comment from Webvizio. Identify the comment by its ID or external ID. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      commentId: z.number().optional().describe('Webvizio internal comment ID'),
      externalId: z.string().optional().describe('External identifier assigned to the comment')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the comment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteComment({
      commentId: ctx.input.commentId,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        deleted: true
      },
      message: `Successfully deleted comment`
    };
  })
  .build();
