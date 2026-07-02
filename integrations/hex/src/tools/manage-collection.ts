import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create a new collection or update an existing collection's name and description. Collections serve as organizational containers for Hex projects.`,
  instructions: [
    'To create a collection, provide "name" without "collectionId".',
    'To update a collection, provide "collectionId" with "name" and/or "description".'
  ]
})
  .input(
    z.object({
      collectionId: z
        .string()
        .optional()
        .describe(
          'UUID of an existing collection to update (omit to create a new collection)'
        ),
      name: z.string().optional().describe('Name for the collection (required when creating)'),
      description: z.string().optional().describe('Description for the collection')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.collectionId) {
      let collection = await client.editCollection(ctx.input.collectionId, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      return {
        output: {
          collectionId: collection.collectionId,
          name: collection.name,
          description: collection.description,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt
        },
        message: `Updated collection **${collection.name}** (${collection.collectionId}).`
      };
    } else {
      if (!ctx.input.name) {
        throw new Error('Name is required when creating a new collection.');
      }
      let collection = await client.createCollection(ctx.input.name, ctx.input.description);
      return {
        output: {
          collectionId: collection.collectionId,
          name: collection.name,
          description: collection.description,
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt
        },
        message: `Created collection **${collection.name}** (${collection.collectionId}).`
      };
    }
  })
  .build();
