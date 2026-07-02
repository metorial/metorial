import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export let createCollection = SlateTool.create(spec, {
  name: 'Create Collection',
  key: 'create_collection',
  description: `Create a new collection to organize notes in your Mem knowledge base. Collections group related notes together and can have a title and description.`,
  constraints: [
    'Collection title can be up to ~1,000 characters.',
    'Collection description can be up to ~10,000 characters.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the collection (max ~1,000 characters).'),
      description: z
        .string()
        .optional()
        .describe('Optional description of the collection (max ~10,000 characters).'),
      collectionId: z.string().optional().describe('Optional custom UUID for the collection.'),
      createdAt: z
        .string()
        .optional()
        .describe('Custom creation timestamp in ISO 8601 format.'),
      updatedAt: z.string().optional().describe('Custom updated timestamp in ISO 8601 format.')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('Unique ID of the created collection.'),
      title: z.string().describe('Title of the created collection.'),
      description: z.string().nullable().describe('Description of the created collection.'),
      createdAt: z.string().describe('Creation timestamp in ISO 8601 format.'),
      updatedAt: z.string().describe('Last updated timestamp in ISO 8601 format.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MemClient({ token: ctx.auth.token });

    let collection = await client.createCollection({
      title: ctx.input.title,
      description: ctx.input.description,
      collectionId: ctx.input.collectionId,
      createdAt: ctx.input.createdAt,
      updatedAt: ctx.input.updatedAt
    });

    return {
      output: {
        collectionId: collection.id,
        title: collection.title,
        description: collection.description,
        createdAt: collection.created_at,
        updatedAt: collection.updated_at
      },
      message: `Created collection **${collection.title}** (${collection.id}).`
    };
  })
  .build();
