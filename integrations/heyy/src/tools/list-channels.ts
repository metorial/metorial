import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listChannelsTool = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List all connected messaging channels in your Heyy business account. Returns channel IDs, names, types (WhatsApp, Instagram, Facebook Messenger, Live Chat), and statuses. Channel IDs are required for sending messages, managing chats, broadcasts, and workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      channels: z
        .array(
          z.object({
            channelId: z.string().describe('Unique identifier of the channel'),
            name: z.string().describe('Channel name'),
            type: z
              .string()
              .describe('Channel type (e.g. WhatsApp, Instagram, Messenger, Live Chat)'),
            status: z.string().describe('Channel status'),
            createdAt: z.string().optional().describe('When the channel was created'),
            updatedAt: z.string().optional().describe('When the channel was last updated')
          })
        )
        .describe('List of connected channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listChannels();

    let channels = (Array.isArray(result) ? result : (result?.channels ?? [])).map(
      (c: any) => ({
        channelId: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      })
    );

    return {
      output: { channels },
      message: `Found **${channels.length}** channel(s).`
    };
  })
  .build();
