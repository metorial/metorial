import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCollection = SlateTool.create(spec, {
  name: 'Update Collection',
  key: 'update_collection',
  description: `Update a collection's external ID and group assignments. Omitted fields and permission flags are read back and preserved; a supplied groups array replaces all group assignments. Collections cannot be created through this API. Avoid concurrent changes during the read-then-replace operation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection to update'),
      externalId: z.string().optional().describe('New external ID (max 300 characters)'),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            readOnly: z.boolean().default(false).describe('Whether group access is read-only'),
            hidePasswords: z
              .boolean()
              .optional()
              .describe(
                'Hide passwords permission; omitted values preserve existing assignment settings.'
              ),
            manage: z
              .boolean()
              .optional()
              .describe(
                'Manage collection permission; omitted values preserve existing assignment settings.'
              )
          })
        )
        .optional()
        .describe('Updated group assignments')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('ID of the updated collection'),
      externalId: z.string().nullable().describe('Updated external ID'),
      groupsAvailable: z
        .boolean()
        .optional()
        .describe(
          'Whether the provider exposed this association field; false means the array does not establish current assignments.'
        ),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            readOnly: z.boolean().describe('Whether access is read-only'),
            hidePasswords: z.boolean().nullable().optional(),
            manage: z.boolean().nullable().optional()
          })
        )
        .describe('Updated group assignments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth
    });

    let result = await client.updateCollection(ctx.input.collectionId, {
      externalId: ctx.input.externalId,
      groups: ctx.input.groups?.map(g => ({
        id: g.groupId,
        readOnly: g.readOnly,
        hidePasswords: g.hidePasswords,
        manage: g.manage
      }))
    });

    return {
      output: {
        collectionId: result.id,
        externalId: result.externalId,
        groupsAvailable: result.groups !== undefined,
        groups: (result.groups ?? []).map(g => ({
          groupId: g.id,
          readOnly: g.readOnly,
          hidePasswords: g.hidePasswords,
          manage: g.manage
        }))
      },
      message: `Updated collection **${result.id}**.`
    };
  })
  .build();
