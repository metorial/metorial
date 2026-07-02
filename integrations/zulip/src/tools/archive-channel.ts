import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveChannel = SlateTool.create(spec, {
  name: 'Archive Channel',
  key: 'archive_channel',
  description: `Archive (deactivate) a Zulip channel. Archived channels are no longer visible and cannot receive new messages. Requires administrator permissions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.number().describe('ID of the channel to archive')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the archive operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    await client.archiveChannel(ctx.input.channelId);

    return {
      output: { success: true },
      message: `Channel ${ctx.input.channelId} archived successfully`
    };
  })
  .build();
