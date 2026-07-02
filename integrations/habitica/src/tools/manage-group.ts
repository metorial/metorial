import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Retrieve, create, or update a Habitica group (party or guild). Use "party" as the groupId to access your current party.
Can also list guilds the user belongs to.`,
  instructions: [
    'Use groupId "party" to access your current party.',
    'To list groups, use action "list" with type "party", "guilds", "privateGuilds", "publicGuilds", or comma-separated.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'list', 'create', 'update']).describe('Action to perform'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID or "party" for the user\'s party. Required for get/update'),
      type: z
        .string()
        .optional()
        .describe(
          'Group type filter for listing (e.g., "party", "guilds", "privateGuilds", "publicGuilds")'
        ),
      name: z.string().optional().describe('Group name (for create/update)'),
      description: z.string().optional().describe('Group description (for create/update)'),
      groupType: z.enum(['party', 'guild']).optional().describe('Type of group to create'),
      privacy: z
        .enum(['private', 'public'])
        .optional()
        .describe('Privacy setting for guild creation')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            name: z.string().optional().describe('Group name'),
            description: z.string().optional().describe('Group description'),
            type: z.string().optional().describe('Group type'),
            privacy: z.string().optional().describe('Privacy setting'),
            memberCount: z.number().optional().describe('Number of members'),
            leader: z.string().optional().describe('Leader user ID'),
            questKey: z.string().optional().describe('Current active quest key'),
            questActive: z.boolean().optional().describe('Whether a quest is currently active')
          })
        )
        .describe('Group(s) returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let mapGroup = (g: Record<string, any>) => ({
      groupId: g.id || g._id,
      name: g.name,
      description: g.description,
      type: g.type,
      privacy: g.privacy,
      memberCount: g.memberCount,
      leader: typeof g.leader === 'object' ? g.leader?._id : g.leader,
      questKey: g.quest?.key,
      questActive: g.quest?.active
    });

    if (ctx.input.action === 'list') {
      let groups = await client.getGroups(ctx.input.type || 'party,guilds');
      return {
        output: { groups: groups.map(mapGroup) },
        message: `Retrieved **${groups.length}** group(s)`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.groupId) throw new Error('groupId is required for get action');
      let group = await client.getGroup(ctx.input.groupId);
      return {
        output: { groups: [mapGroup(group)] },
        message: `Retrieved group **${group.name}**`
      };
    }

    if (ctx.input.action === 'create') {
      let groupData: Record<string, any> = {};
      if (ctx.input.name) groupData.name = ctx.input.name;
      if (ctx.input.description) groupData.description = ctx.input.description;
      if (ctx.input.groupType) groupData.type = ctx.input.groupType;
      if (ctx.input.privacy) groupData.privacy = ctx.input.privacy;

      let group = await client.createGroup(groupData);
      return {
        output: { groups: [mapGroup(group)] },
        message: `Created group **${group.name}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.groupId) throw new Error('groupId is required for update action');
      let groupData: Record<string, any> = {};
      if (ctx.input.name) groupData.name = ctx.input.name;
      if (ctx.input.description) groupData.description = ctx.input.description;

      let group = await client.updateGroup(ctx.input.groupId, groupData);
      return {
        output: { groups: [mapGroup(group)] },
        message: `Updated group **${group.name}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
