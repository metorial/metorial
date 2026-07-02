import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';
import { channelSchema, mapChannel } from './shared';

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `Retrieve all channels accessible to the authenticated user. Returns public team channels and private channels where the user is a member, including channel metadata and member lists.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      channels: z.array(channelSchema).describe('List of accessible channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let channels = await client.getChannels();
    let mapped = (channels || []).map((channel: any) => mapChannel(channel));

    return {
      output: { channels: mapped },
      message: `Found **${mapped.length}** channel(s).`
    };
  })
  .build();
