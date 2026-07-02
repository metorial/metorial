import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let channelOutputSchema = z.object({
  channelId: z.string(),
  address: z.string(),
  type: z.string(),
  name: z.string().optional(),
  sendAs: z.string().optional(),
  isPrivate: z.boolean()
});

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List Front channels available in the company. Use this to find channel IDs or addresses for sending new outbound messages.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      channels: z.array(channelOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listChannels();

    let channels = result._results.map(channel => ({
      channelId: channel.id,
      address: channel.address,
      type: channel.type,
      name: channel.name,
      sendAs: channel.send_as,
      isPrivate: channel.is_private
    }));

    return {
      output: { channels },
      message: `Found **${channels.length}** channels.`
    };
  });

export let getChannel = SlateTool.create(spec, {
  name: 'Get Channel',
  key: 'get_channel',
  description: `Retrieve details for a specific Front channel.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID or channel address alias to retrieve')
    })
  )
  .output(channelOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let channel = await client.getChannel(ctx.input.channelId);

    return {
      output: {
        channelId: channel.id,
        address: channel.address,
        type: channel.type,
        name: channel.name,
        sendAs: channel.send_as,
        isPrivate: channel.is_private
      },
      message: `Retrieved channel **${channel.name || channel.address}**.`
    };
  });
