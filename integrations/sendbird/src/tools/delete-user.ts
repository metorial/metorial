import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user from your Sendbird application. This action is irreversible and removes the user from all channels.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    await client.deleteUser(ctx.input.userId);

    return {
      output: {
        success: true
      },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();
