import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve detailed information about a specific group, including its collection assignments and member IDs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to retrieve')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('Unique ID of the group'),
      name: z.string().describe('Name of the group'),
      accessAll: z.boolean().describe('Whether the group has access to all collections'),
      externalId: z.string().nullable().describe('External ID for directory sync'),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID'),
            readOnly: z.boolean().describe('Whether access is read-only')
          })
        )
        .describe('Collections assigned to this group'),
      memberIds: z.array(z.string()).describe('IDs of members in this group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let group = await client.getGroup(ctx.input.groupId);
    let memberIds = await client.getGroupMemberIds(ctx.input.groupId);

    return {
      output: {
        groupId: group.id,
        name: group.name,
        accessAll: group.accessAll,
        externalId: group.externalId,
        collections: group.collections.map(c => ({
          collectionId: c.id,
          readOnly: c.readOnly
        })),
        memberIds
      },
      message: `Retrieved group **${group.name}** with **${memberIds.length}** member(s).`
    };
  })
  .build();
