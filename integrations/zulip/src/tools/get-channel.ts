import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { channelSchema, mapChannel } from './list-channels';

export let getChannel = SlateTool.create(spec, {
  name: 'Get Channel',
  key: 'get_channel',
  description:
    'Get the metadata and permissions of an accessible Zulip channel. Call list_channels to discover channel IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      channelId: z
        .number()
        .describe('Channel ID. Call list_channels to discover accessible channels.')
    })
  )
  .output(z.object({ channel: channelSchema }))
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getChannelById(ctx.input.channelId);
    return {
      output: { channel: mapChannel(result.stream) },
      message: `Retrieved channel ${ctx.input.channelId}`
    };
  })
  .build();
