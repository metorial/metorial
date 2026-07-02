import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlatformClient } from '../lib/client';
import { spec } from '../spec';

export let listChannelsTool = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `Retrieve all channels configured in your Landbot account. Channels represent deployment targets such as web, WhatsApp, Messenger, and APIChat.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      channels: z.array(z.record(z.string(), z.any())).describe('List of channel records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);
    let result = await client.listChannels();
    let channels = result.results ?? result.channels ?? (Array.isArray(result) ? result : []);

    return {
      output: { channels },
      message: `Retrieved **${channels.length}** channels.`
    };
  });

export let getChannelTool = SlateTool.create(spec, {
  name: 'Get Channel',
  key: 'get_channel',
  description: `Retrieve detailed information about a specific channel by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.number().describe('Numeric ID of the channel')
    })
  )
  .output(
    z.object({
      channel: z.record(z.string(), z.any()).describe('Channel configuration and details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlatformClient(ctx.auth.token);
    let channel = await client.getChannel(ctx.input.channelId);

    return {
      output: { channel },
      message: `Retrieved channel **#${ctx.input.channelId}**.`
    };
  });
