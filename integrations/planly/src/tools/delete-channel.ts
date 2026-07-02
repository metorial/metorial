import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteChannel = SlateTool.create(spec, {
  name: 'Delete Channel',
  key: 'delete_channel',
  description: `Disconnect and remove a social media channel from Planly. This removes the channel and its associated data. To reconnect, use the Planly web interface.`,
  constraints: [
    'This action is irreversible. The channel must be reconnected through the web interface.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the channel was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteChannel(ctx.input.channelId);

    return {
      output: { success: true },
      message: `Channel ${ctx.input.channelId} deleted successfully.`
    };
  });
