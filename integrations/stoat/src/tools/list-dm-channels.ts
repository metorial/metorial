import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { requireArray } from '../lib/response';
import { spec } from '../spec';

export let listDMChannels = SlateTool.create(spec, {
  name: 'List Direct Message Channels',
  key: 'list_dm_channels',
  description:
    'List accessible direct message and group channels to discover channel IDs for reading or sending messages. Available to user sessions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      channels: z.array(
        z.object({
          channelId: z.string(),
          channelType: z.string(),
          name: z.string().optional(),
          recipients: z.array(z.string()).optional(),
          active: z.boolean().optional(),
          lastMessageId: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let channels = requireArray(
      await createClient(ctx).fetchDMChannels(),
      'direct message channels'
    );
    return {
      output: {
        channels: channels.map(channel => ({
          channelId: channel._id,
          channelType: channel.channel_type,
          name: channel.name ?? undefined,
          recipients: channel.recipients ?? undefined,
          active: channel.active ?? undefined,
          lastMessageId: channel.last_message_id ?? undefined
        }))
      },
      message: `Found ${channels.length} direct message channel(s).`
    };
  })
  .build();
