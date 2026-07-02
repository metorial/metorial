import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let createGroupChannel = SlateTool.create(spec, {
  name: 'Create Group Channel',
  key: 'create_group_channel',
  description: `Create a new group channel. Group channels are private or public channels for a defined set of members. Supports distinct, super group, and ephemeral channel types.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Channel name'),
      channelUrl: z
        .string()
        .optional()
        .describe('Custom channel URL. Auto-generated if not provided.'),
      coverUrl: z.string().optional().describe('URL of the channel cover image'),
      customType: z.string().optional().describe('Custom channel type for categorization'),
      userIds: z.array(z.string()).optional().describe('User IDs to add as initial members'),
      operatorIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to designate as operators'),
      isDistinct: z
        .boolean()
        .optional()
        .describe('If true, reuse existing channel with same members'),
      isPublic: z
        .boolean()
        .optional()
        .describe('If true, any user can join without invitation'),
      isSuper: z
        .boolean()
        .optional()
        .describe('If true, create a super group channel (up to 2000 members)'),
      isEphemeral: z.boolean().optional().describe('If true, messages are not persisted'),
      accessCode: z
        .string()
        .optional()
        .describe('Access code required to join a public channel'),
      inviterId: z.string().optional().describe('User ID of the inviter')
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
      isSuper: z.boolean().describe('Whether this is a super group channel'),
      isEphemeral: z.boolean().describe('Whether the channel is ephemeral'),
      isFrozen: z.boolean().describe('Whether the channel is frozen'),
      createdAt: z.number().describe('Unix timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.createGroupChannel({
      name: ctx.input.name,
      channelUrl: ctx.input.channelUrl,
      coverUrl: ctx.input.coverUrl,
      customType: ctx.input.customType,
      userIds: ctx.input.userIds,
      operatorIds: ctx.input.operatorIds,
      isDistinct: ctx.input.isDistinct,
      isPublic: ctx.input.isPublic,
      isSuper: ctx.input.isSuper,
      isEphemeral: ctx.input.isEphemeral,
      accessCode: ctx.input.accessCode,
      inviterId: ctx.input.inviterId
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
        isSuper: result.is_super ?? false,
        isEphemeral: result.is_ephemeral ?? false,
        isFrozen: result.freeze ?? false,
        createdAt: result.created_at ?? 0
      },
      message: `Created group channel **${result.name || result.channel_url}** with ${result.member_count ?? 0} member(s).`
    };
  })
  .build();
