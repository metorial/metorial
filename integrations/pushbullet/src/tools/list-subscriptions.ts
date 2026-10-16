import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubscriptions = SlateTool.create(spec, {
  name: 'List Subscriptions',
  key: 'list_subscriptions',
  description: `Retrieve a page of channel subscriptions for the Pushbullet account. Returns channel details including name, tag, description, and mute status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      activeOnly: z
        .boolean()
        .optional()
        .default(true)
        .describe('Only return active subscriptions'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum results per page, from 1 to 500'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return records modified after this Unix timestamp in seconds')
    })
  )
  .output(
    z.object({
      subscriptions: z.array(
        z.object({
          subscriptionIden: z.string().describe('Unique identifier of the subscription'),
          active: z.boolean().describe('Whether the subscription is active'),
          muted: z.boolean().optional().describe('Whether notifications are muted'),
          channelIden: z.string().optional().describe('Unique identifier of the channel'),
          channelTag: z.string().optional().describe('Globally unique channel tag'),
          channelName: z.string().optional().describe('Channel display name'),
          channelDescription: z.string().optional().describe('Channel description'),
          channelImageUrl: z.string().optional().describe('Channel image URL'),
          channelWebsiteUrl: z.string().optional().describe('Channel website URL'),
          created: z.string().describe('Creation Unix timestamp'),
          modified: z.string().describe('Last modification Unix timestamp'),
          raw: z.unknown().optional().describe('Complete provider record')
        })
      ),
      cursor: z
        .string()
        .optional()
        .describe('Cursor for the next page, when more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSubscriptions({
      active: ctx.input.activeOnly,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      modifiedAfter: ctx.input.modifiedAfter
    });

    let subscriptions = (result.subscriptions ?? []).map(s => ({
      subscriptionIden: s.iden,
      active: s.active,
      muted: s.muted,
      channelIden: s.channel?.iden,
      channelTag: s.channel?.tag,
      channelName: s.channel?.name,
      channelDescription: s.channel?.description,
      channelImageUrl: s.channel?.image_url,
      channelWebsiteUrl: s.channel?.website_url,
      created: String(s.created),
      modified: String(s.modified),
      raw: s
    }));

    return {
      output: { subscriptions, cursor: result.cursor },
      message: `Found **${subscriptions.length}** subscription(s).`
    };
  })
  .build();
