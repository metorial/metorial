import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCollection = SlateTool.create(spec, {
  name: 'Update Collection',
  key: 'update_collection',
  description: `Update a collection's external ID and group assignments. Collections cannot be created via the Public API, only updated or deleted.`,
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
            readOnly: z.boolean().default(false).describe('Whether group access is read-only')
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
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            readOnly: z.boolean().describe('Whether access is read-only')
          })
        )
        .describe('Updated group assignments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let result = await client.updateCollection(ctx.input.collectionId, {
      externalId: ctx.input.externalId,
      groups: ctx.input.groups?.map(g => ({
        id: g.groupId,
        readOnly: g.readOnly
      }))
    });

    return {
      output: {
        collectionId: result.id,
        externalId: result.externalId,
        groups: result.groups.map(g => ({
          groupId: g.id,
          readOnly: g.readOnly
        }))
      },
      message: `Updated collection **${result.id}**.`
    };
  })
  .build();
