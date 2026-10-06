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
      accessAll: z
        .boolean()
        .nullable()
        .describe(
          'Legacy accessAll response, null when not exposed by the current Public API'
        ),
      externalId: z.string().nullable().describe('External ID for directory sync'),
      collectionsAvailable: z
        .boolean()
        .optional()
        .describe(
          'Whether the provider exposed this association field; false means the array does not establish current assignments.'
        ),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID'),
            readOnly: z.boolean().describe('Whether access is read-only'),
            hidePasswords: z.boolean().nullable().optional(),
            manage: z.boolean().nullable().optional()
          })
        )
        .describe('Collections assigned to this group'),
      memberIds: z.array(z.string()).describe('IDs of members in this group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth
    });

    let group = await client.getGroup(ctx.input.groupId);
    let memberIds = await client.getGroupMemberIds(ctx.input.groupId);

    return {
      output: {
        groupId: group.id,
        name: group.name,
        accessAll: group.accessAll,
        externalId: group.externalId,
        collectionsAvailable: group.collections !== undefined,
        collections: (group.collections ?? []).map(c => ({
          collectionId: c.id,
          readOnly: c.readOnly,
          hidePasswords: c.hidePasswords,
          manage: c.manage
        })),
        memberIds
      },
      message: `Retrieved group **${group.name}** with **${memberIds.length}** member(s).`
    };
  })
  .build();
