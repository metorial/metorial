import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `Retrieve messaging channels configured on your TextIt workspace (e.g., Twilio, WhatsApp, Telegram, Android). Channels are the connections through which messages are sent and received.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelUuid: z.string().optional().describe('Filter by channel UUID'),
      address: z.string().optional().describe('Filter by channel address (e.g., phone number)')
    })
  )
  .output(
    z.object({
      channels: z.array(
        z.object({
          channelUuid: z.string(),
          name: z.string(),
          address: z.string(),
          country: z.string(),
          lastSeen: z.string(),
          createdOn: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listChannels({
      uuid: ctx.input.channelUuid,
      address: ctx.input.address
    });

    let channels = result.results.map(c => ({
      channelUuid: c.uuid,
      name: c.name,
      address: c.address,
      country: c.country,
      lastSeen: c.last_seen,
      createdOn: c.created_on
    }));

    return {
      output: {
        channels,
        hasMore: result.next !== null
      },
      message: `Found **${channels.length}** channel(s).`
    };
  })
  .build();
