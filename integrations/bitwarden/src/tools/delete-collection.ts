import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCollection = SlateTool.create(spec, {
  name: 'Delete Collection',
  key: 'delete_collection',
  description: `Permanently delete a collection from the Bitwarden organization. All items in the collection will lose this collection assignment.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the collection was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.deleteCollection(ctx.input.collectionId);

    return {
      output: { deleted: true },
      message: `Deleted collection **${ctx.input.collectionId}**.`
    };
  })
  .build();
