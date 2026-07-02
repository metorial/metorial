import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let getGroupProfile = SlateTool.create(spec, {
  name: 'Get Group Profile',
  key: 'get_group_profile',
  description: `Retrieve a group (account/company) profile from Appcues. Group properties are used for targeting experiences at the group level.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('The unique identifier of the group')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('The group ID'),
      properties: z
        .record(z.string(), z.any())
        .describe('All profile properties for the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let profile = await client.getGroupProfile(ctx.input.groupId);

    return {
      output: {
        groupId: ctx.input.groupId,
        properties: profile || {}
      },
      message: `Retrieved profile for group \`${ctx.input.groupId}\` with **${Object.keys(profile || {}).length}** properties.`
    };
  })
  .build();

export let updateGroupProfile = SlateTool.create(spec, {
  name: 'Update Group Profile',
  key: 'update_group_profile',
  description: `Update profile properties for a group (account/company) in Appcues. Group properties can be used for targeting experiences at the group level. Also supports associating users with the group.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('The unique identifier of the group'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value pairs of group properties to set or update'),
      userIds: z.array(z.string()).optional().describe('User IDs to associate with this group')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('The group ID that was updated'),
      success: z.boolean().describe('Whether the update succeeded'),
      usersAssociated: z
        .number()
        .optional()
        .describe('Number of users associated with the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let messages: string[] = [];

    if (ctx.input.properties && Object.keys(ctx.input.properties).length > 0) {
      await client.updateGroupProfile(ctx.input.groupId, ctx.input.properties);
      messages.push(`Updated **${Object.keys(ctx.input.properties).length}** properties`);
    }

    if (ctx.input.userIds && ctx.input.userIds.length > 0) {
      await client.associateUsersToGroup(ctx.input.groupId, ctx.input.userIds);
      messages.push(`Associated **${ctx.input.userIds.length}** users`);
    }

    return {
      output: {
        groupId: ctx.input.groupId,
        success: true,
        usersAssociated: ctx.input.userIds?.length || undefined
      },
      message: `Group \`${ctx.input.groupId}\`: ${messages.join(' and ')}.`
    };
  })
  .build();
