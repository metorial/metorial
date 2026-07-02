import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let deleteGroupChannel = SlateTool.create(spec, {
  name: 'Delete Group Channel',
  key: 'delete_group_channel',
  description: `Permanently delete a group channel and all its messages. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      channelUrl: z.string().describe('URL of the group channel to delete')
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

    await client.deleteGroupChannel(ctx.input.channelUrl);

    return {
      output: {
        success: true
      },
      message: `Deleted group channel **${ctx.input.channelUrl}**.`
    };
  })
  .build();
