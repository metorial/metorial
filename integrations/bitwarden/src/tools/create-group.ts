import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new group in the Bitwarden organization. Groups can be assigned to collections and have members added to simplify permission management.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the group (max 100 characters)'),
      accessAll: z
        .boolean()
        .default(false)
        .describe(
          'Legacy field: false only. The current Public API uses explicit collection assignments; true is refused before any change.'
        ),
      externalId: z
        .string()
        .optional()
        .describe('External ID for directory sync (max 300 characters)'),
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
        .describe('Collections to assign to the group'),
      memberIds: z.array(z.string()).optional().describe('Member IDs to add to the group')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the created group'),
      name: z.string().describe('Name of the created group'),
      accessAll: z
        .boolean()
        .nullable()
        .describe(
          'Legacy accessAll response; null when not exposed by the current Public API'
        ),
      externalId: z.string().nullable().describe('External ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      ...ctx.auth
    });

    let group = await client.createGroup({
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
      message: `Created group **${group.name}**.`
    };
  })
  .build();
