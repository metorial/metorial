import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let getGroupChannel = SlateTool.create(spec, {
  name: 'Get Group Channel',
  key: 'get_group_channel',
  description:
    'Get a group channel by its URL, including its name, membership count, and channel settings.',
  tags: { readOnly: true }
})
  .input(z.object({ channelUrl: z.string().min(1).describe('URL of the group channel') }))
  .output(
    z.object({
      channelUrl: z.string(),
      name: z.string(),
      coverUrl: z.string(),
      customType: z.string(),
      data: z.string().optional(),
      memberCount: z.number(),
      isDistinct: z.boolean(),
      isPublic: z.boolean(),
      isSuper: z.boolean(),
      isEphemeral: z.boolean(),
      isFrozen: z.boolean(),
      createdAt: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });
    let channel = await client.getGroupChannel(ctx.input.channelUrl);
    return {
      output: {
        channelUrl: channel.channel_url,
        name: channel.name ?? '',
        coverUrl: channel.cover_url ?? '',
        customType: channel.custom_type ?? '',
        data: channel.data ?? undefined,
        memberCount: channel.member_count ?? 0,
        isDistinct: channel.is_distinct ?? false,
        isPublic: channel.is_public ?? false,
        isSuper: channel.is_super ?? false,
        isEphemeral: channel.is_ephemeral ?? false,
        isFrozen: channel.freeze ?? false,
        createdAt: channel.created_at ?? 0
      },
      message: `Retrieved group channel **${channel.name || channel.channel_url}**.`
    };
  })
  .build();
