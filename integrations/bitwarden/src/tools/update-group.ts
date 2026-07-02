import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update an existing group's name, access settings, collection assignments, and/or member list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to update'),
      name: z.string().describe('New name for the group'),
      accessAll: z
        .boolean()
        .describe('Whether the group should have access to all collections'),
      externalId: z.string().optional().describe('External ID for directory sync'),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID'),
            readOnly: z.boolean().default(false).describe('Whether access is read-only')
          })
        )
        .optional()
        .describe('Updated collection assignments'),
      memberIds: z.array(z.string()).optional().describe('Updated member IDs for this group')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the updated group'),
      name: z.string().describe('Updated name'),
      accessAll: z.boolean().describe('Updated access-all setting'),
      externalId: z.string().nullable().describe('Updated external ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let group = await client.updateGroup(ctx.input.groupId, {
      name: ctx.input.name,
      accessAll: ctx.input.accessAll,
      externalId: ctx.input.externalId,
      collections: ctx.input.collections?.map(c => ({
        id: c.collectionId,
        readOnly: c.readOnly
      }))
    });

    if (ctx.input.memberIds) {
      await client.updateGroupMemberIds(ctx.input.groupId, ctx.input.memberIds);
    }

    return {
      output: {
        groupId: group.id,
        name: group.name,
        accessAll: group.accessAll,
        externalId: group.externalId
      },
      message: `Updated group **${group.name}**.`
    };
  })
  .build();
