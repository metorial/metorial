import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update a group's name and specified assignments. Omitted external ID and assignments are read back and preserved before the replacement update. Member assignment is a separate operation; reconcile the group if a later stage fails.`,
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
        .describe(
          'Legacy field: false only. The current Public API uses explicit collection assignments; true is refused before any change.'
        ),
      externalId: z.string().optional().describe('External ID for directory sync'),
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID'),
            readOnly: z.boolean().default(false).describe('Whether access is read-only'),
            hidePasswords: z
              .boolean()
              .optional()
              .describe(
                'Hide passwords permission; omitted values preserve existing assignment settings on updates.'
              ),
            manage: z
              .boolean()
              .optional()
              .describe(
                'Manage collection permission; omitted values preserve existing assignment settings on updates.'
              )
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
      accessAll: z
        .boolean()
        .nullable()
        .describe(
          'Legacy accessAll response; null when not exposed by the current Public API'
        ),
      externalId: z.string().nullable().describe('Updated external ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth
    });

    let group = await client.updateGroup(ctx.input.groupId, {
      name: ctx.input.name,
      accessAll: ctx.input.accessAll,
      externalId: ctx.input.externalId,
      memberIds: ctx.input.memberIds,
      collections: ctx.input.collections?.map(c => ({
        id: c.collectionId,
        readOnly: c.readOnly,
        hidePasswords: c.hidePasswords,
        manage: c.manage
      }))
    });

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
