import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let listGroupChannels = SlateTool.create(spec, {
  name: 'List Group Channels',
  key: 'list_group_channels',
  description: `List group channels with filtering and pagination. Filter by name, custom type, member composition, visibility, and more. Use **nextToken** for pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results to return (default 10, max 100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response'),
      showMember: z.boolean().optional().describe('Include member details in response'),
      showEmpty: z.boolean().optional().describe('Include channels with no messages'),
      showFrozen: z.boolean().optional().describe('Include frozen channels'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter channels whose name contains this string'),
      customType: z.string().optional().describe('Filter by custom type'),
      membersIncludeIn: z
        .array(z.string())
        .optional()
        .describe('Filter channels that include all specified users'),
      publicMode: z
        .enum(['public', 'private', 'all'])
        .optional()
        .describe('Filter by public/private status'),
      superMode: z
        .enum(['super', 'nonsuper', 'all'])
        .optional()
        .describe('Filter by super group status'),
      createdAfter: z
        .number()
        .optional()
        .describe('Filter channels created after this Unix timestamp'),
      createdBefore: z
        .number()
        .optional()
        .describe('Filter channels created before this Unix timestamp')
    })
  )
  .output(
    z.object({
      channels: z
        .array(
          z.object({
            channelUrl: z.string().describe('Unique channel URL'),
            name: z.string().describe('Channel name'),
            coverUrl: z.string().describe('Cover image URL'),
            customType: z.string().describe('Custom channel type'),
            memberCount: z.number().describe('Number of members'),
            isDistinct: z.boolean().describe('Whether the channel is distinct'),
            isPublic: z.boolean().describe('Whether the channel is public'),
            isSuper: z.boolean().describe('Whether this is a super group channel'),
            isFrozen: z.boolean().describe('Whether the channel is frozen'),
            createdAt: z.number().describe('Unix timestamp of creation'),
            lastMessage: z.any().optional().describe('Last message in the channel')
          })
        )
        .describe('List of group channels'),
      nextToken: z.string().optional().describe('Token for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.listGroupChannels({
      limit: ctx.input.limit,
      token: ctx.input.nextToken,
      showMember: ctx.input.showMember,
      showEmpty: ctx.input.showEmpty,
      showFrozen: ctx.input.showFrozen,
      nameContains: ctx.input.nameContains,
      customType: ctx.input.customType,
      membersIncludeIn: ctx.input.membersIncludeIn,
      publicMode: ctx.input.publicMode,
      superMode: ctx.input.superMode,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore
    });

    let channels = (result.channels ?? []).map((ch: any) => ({
      channelUrl: ch.channel_url,
      name: ch.name ?? '',
      coverUrl: ch.cover_url ?? '',
      customType: ch.custom_type ?? '',
      memberCount: ch.member_count ?? 0,
      isDistinct: ch.is_distinct ?? false,
      isPublic: ch.is_public ?? false,
      isSuper: ch.is_super ?? false,
      isFrozen: ch.freeze ?? false,
      createdAt: ch.created_at ?? 0,
      lastMessage: ch.last_message
    }));

    return {
      output: {
        channels,
        nextToken: result.next || undefined
      },
      message: `Found **${channels.length}** group channel(s).${result.next ? ' More results available.' : ''}`
    };
  })
  .build();
