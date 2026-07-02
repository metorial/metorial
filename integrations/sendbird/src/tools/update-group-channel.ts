import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let updateGroupChannel = SlateTool.create(spec, {
  name: 'Update Group Channel',
  key: 'update_group_channel',
  description: `Update a group channel's properties such as name, cover image, custom type, visibility, and freeze status. Can also update operator assignments.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelUrl: z.string().describe('URL of the group channel to update'),
      name: z.string().optional().describe('New channel name'),
      coverUrl: z.string().optional().describe('New cover image URL'),
      customType: z.string().optional().describe('New custom type'),
      data: z.string().optional().describe('Additional data stored with the channel'),
      isDistinct: z.boolean().optional().describe('Whether the channel is distinct'),
      isPublic: z.boolean().optional().describe('Whether the channel is public'),
      accessCode: z.string().optional().describe('Access code for public channels'),
      operatorIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to set as operators (replaces existing)'),
      isFrozen: z.boolean().optional().describe('Whether to freeze/unfreeze the channel')
    })
  )
  .output(
    z.object({
      channelUrl: z.string().describe('Unique channel URL'),
      name: z.string().describe('Channel name'),
      coverUrl: z.string().describe('Cover image URL'),
      customType: z.string().describe('Custom channel type'),
      memberCount: z.number().describe('Number of members'),
      isDistinct: z.boolean().describe('Whether the channel is distinct'),
      isPublic: z.boolean().describe('Whether the channel is public'),
      isFrozen: z.boolean().describe('Whether the channel is frozen'),
      createdAt: z.number().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.updateGroupChannel(ctx.input.channelUrl, {
      name: ctx.input.name,
      coverUrl: ctx.input.coverUrl,
      customType: ctx.input.customType,
      data: ctx.input.data,
      isDistinct: ctx.input.isDistinct,
      isPublic: ctx.input.isPublic,
      accessCode: ctx.input.accessCode,
      operatorIds: ctx.input.operatorIds,
      isFrozen: ctx.input.isFrozen
    });

    return {
      output: {
        channelUrl: result.channel_url,
        name: result.name ?? '',
        coverUrl: result.cover_url ?? '',
        customType: result.custom_type ?? '',
        memberCount: result.member_count ?? 0,
        isDistinct: result.is_distinct ?? false,
        isPublic: result.is_public ?? false,
        isFrozen: result.freeze ?? false,
        createdAt: result.created_at ?? 0
      },
      message: `Updated group channel **${result.name || result.channel_url}**.`
    };
  })
  .build();
