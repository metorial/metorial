import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z.object({
  channelId: z.string().optional().describe('Channel identifier.'),
  name: z.string().optional().describe('Custom channel name.'),
  channel: z.string().optional().describe('Channel platform (e.g. Whatsapp).')
});

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `Retrieve the WhatsApp channels (phone numbers) connected to your Wati account. Use this to find channel identifiers for multi-number setups.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().int().min(1).default(1).describe('Page number (1-based).'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe('Number of channels per page (max 100).')
    })
  )
  .output(
    z.object({
      channels: z.array(channelSchema).describe('List of connected channels.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let result = await client.listChannels({
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let channels = (result?.channels || []).map((c: any) => ({
      channelId: c.id,
      name: c.name,
      channel: c.channel
    }));

    return {
      output: { channels },
      message: `Retrieved **${channels.length}** channels.`
    };
  })
  .build();
