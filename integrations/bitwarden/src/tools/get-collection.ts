import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCollection = SlateTool.create(spec, {
  key: 'get_collection',
  name: 'Get Collection',
  description:
    'Read an exact organization collection and its group permissions. Discover its collectionId with list_collections. Collection names and vault items are not available through this API.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      collectionId: z.string().describe('Exact collection UUID from list_collections.')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      externalId: z.string().nullable(),
      groupsAvailable: z
        .boolean()
        .optional()
        .describe(
          'Whether the provider exposed this association field; false means the array does not establish current assignments.'
        ),
      groups: z.array(
        z.object({
          groupId: z.string(),
          readOnly: z.boolean(),
          hidePasswords: z.boolean().nullable().optional(),
          manage: z.boolean().nullable().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const value = await new Client({ ...ctx.auth }).getCollection(ctx.input.collectionId);
    return {
      output: {
        collectionId: value.id,
        externalId: value.externalId,
        groupsAvailable: value.groups !== undefined,
        groups: (value.groups ?? []).map(g => ({
          groupId: g.id,
          readOnly: g.readOnly,
          hidePasswords: g.hidePasswords,
          manage: g.manage
        }))
      },
      message:
        value.groups === undefined
          ? 'Retrieved collection metadata; group assignments are not exposed.'
          : 'Retrieved the exact collection permissions.'
    };
  })
  .build();
