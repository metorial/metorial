import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteObject = SlateTool.create(spec, {
  name: 'Delete Object',
  key: 'delete_object',
  description: `Delete a specific object from a collection by its UUID. This permanently removes the object and its vector embedding.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection'),
      objectId: z.string().describe('UUID of the object to delete'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the object was deleted'),
      objectId: z.string().describe('UUID of the deleted object')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteObject(ctx.input.collectionName, ctx.input.objectId, {
      tenant: ctx.input.tenant
    });
    return {
      output: {
        deleted: true,
        objectId: ctx.input.objectId
      },
      message: `Deleted object **${ctx.input.objectId}** from **${ctx.input.collectionName}**.`
    };
  })
  .build();
