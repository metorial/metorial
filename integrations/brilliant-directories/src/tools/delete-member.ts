import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMember = SlateTool.create(spec, {
  name: 'Delete Member',
  key: 'delete_member',
  description: `Permanently delete a member (user) from the directory. Optionally deletes associated images.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The user ID of the member to delete.'),
      deleteImages: z
        .boolean()
        .optional()
        .describe(
          'Whether to also delete images associated with the member. Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      confirmation: z.string().describe('Confirmation message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.deleteUser(ctx.input.userId, ctx.input.deleteImages);

    return {
      output: {
        status: result.status,
        confirmation:
          typeof result.message === 'string' ? result.message : JSON.stringify(result.message)
      },
      message: `Deleted member **${ctx.input.userId}**.`
    };
  })
  .build();
