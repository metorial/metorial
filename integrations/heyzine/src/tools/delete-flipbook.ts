import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let deleteFlipbook = SlateTool.create(spec, {
  name: 'Delete Flipbook',
  key: 'delete_flipbook',
  description: `Permanently deletes a flipbook from the account. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      flipbookId: z.string().describe('Unique identifier of the flipbook to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful.'),
      message: z.string().describe('Response message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    let result = await client.deleteFlipbook(ctx.input.flipbookId);

    return {
      output: {
        success: result.success,
        message: result.msg
      },
      message: `Flipbook **${ctx.input.flipbookId}** deleted successfully.`
    };
  })
  .build();
