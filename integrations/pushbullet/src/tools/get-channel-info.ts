import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getChannelInfo = SlateTool.create(spec, {
  name: 'Get Channel Info',
  key: 'get_channel_info',
  description: `Look up public information about a Pushbullet channel by its tag. Returns the channel name, description, subscriber count, and optionally its recent pushes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      channelTag: z.string().describe('Globally unique tag of the channel to look up'),
      includeRecentPushes: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include recent pushes from the channel')
    })
  )
  .output(
    z.object({
      channelIden: z.string().describe('Unique identifier of the channel'),
      channelTag: z.string().describe('Globally unique channel tag'),
      channelName: z.string().describe('Display name of the channel'),
      channelDescription: z.string().optional().describe('Channel description'),
      imageUrl: z.string().optional().describe('Channel image URL'),
      websiteUrl: z.string().optional().describe('Channel website URL'),
      subscriberCount: z.number().optional().describe('Number of subscribers'),
      recentPushes: z
        .array(
          z.object({
            pushIden: z.string().describe('Push identifier'),
            type: z.string().describe('Push type'),
            title: z.string().optional().describe('Push title'),
            body: z.string().optional().describe('Push body'),
            url: z.string().optional().describe('Push URL'),
            created: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('Recent pushes from the channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let info = await client.getChannelInfo(
      ctx.input.channelTag,
      !ctx.input.includeRecentPushes
    );

    let recentPushes = info.recent_pushes?.map(p => ({
      pushIden: p.iden,
      type: p.type,
      title: p.title,
      body: p.body,
      url: p.url,
      created: String(p.created)
    }));

    return {
      output: {
        channelIden: info.iden,
        channelTag: info.tag,
        channelName: info.name,
        channelDescription: info.description,
        imageUrl: info.image_url,
        websiteUrl: info.website_url,
        subscriberCount: info.subscriber_count,
        recentPushes
      },
      message: `Channel **${info.name}** (#${info.tag}) has ${info.subscriber_count ?? 'unknown'} subscriber(s).`
    };
  })
  .build();
