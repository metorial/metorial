import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let getCollection = SlateTool.create(spec, {
  name: 'Get Collection',
  key: 'get_collection',
  description: `Retrieve a specific collection by its ID, including its title and description.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('The UUID of the collection to retrieve.')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('Unique ID of the collection.'),
      title: z.string().describe('Title of the collection.'),
      description: z.string().nullable().describe('Description of the collection.'),
      createdAt: z.string().describe('Creation timestamp in ISO 8601 format.'),
      updatedAt: z.string().describe('Last updated timestamp in ISO 8601 format.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let collection = await client.getCollection(ctx.input.collectionId);

    return {
      output: {
        collectionId: collection.id,
        title: collection.title,
        description: collection.description,
        createdAt: collection.created_at,
        updatedAt: collection.updated_at
      },
      message: `Retrieved collection **${collection.title}** (${collection.id}).`
    };
  })
  .build();
