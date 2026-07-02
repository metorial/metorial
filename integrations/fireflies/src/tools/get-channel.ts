import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';
import { channelSchema, mapChannel } from './shared';

export let getChannel = SlateTool.create(spec, {
  name: 'Get Channel',
  key: 'get_channel',
  description: `Retrieve a Fireflies channel by ID, including privacy, creation metadata, and members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('The channel ID to retrieve')
    })
  )
  .output(channelSchema)
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let channel = await client.getChannel(ctx.input.channelId);
    let output = mapChannel(channel);

    return {
      output,
      message: `Retrieved channel **${output.title ?? output.channelId}**.`
    };
  })
  .build();
