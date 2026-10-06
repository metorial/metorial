import { SlateTool } from 'slates';
import { z } from 'zod';
import { MemClient } from '../lib/client';
import { spec } from '../spec';

export const updateCollection = SlateTool.create(spec, {
  name: 'Update Collection',
  key: 'update_collection',
  description: 'Update a Mem collection title or description while preserving omitted fields.',
  constraints: [
    'Supply title or description. Titles allow 1,000 characters and UTF-8 bytes; descriptions allow 10,000 characters and UTF-8 bytes.',
    'An explicit null description clears it. A modification timestamp must include a timezone offset and cannot be in the future. Inspect uncertain writes before retrying.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      collectionId: z
        .string()
        .describe('Exact collection UUID from create, get, list or search.'),
      title: z
        .string()
        .optional()
        .describe('Desired collection title; omit to preserve the current title.'),
      description: z
        .string()
        .nullable()
        .optional()
        .describe('Desired description; null clears it, omission preserves it.'),
      updatedAt: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Optional ISO 8601 modification timestamp with timezone offset, not in the future.'
        )
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      requestId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const collection = await new MemClient({ token: ctx.auth.token }).updateCollection(
      ctx.input
    );
    return {
      output: {
        collectionId: collection.id,
        title: collection.title,
        description: collection.description,
        createdAt: collection.created_at,
        updatedAt: collection.updated_at,
        requestId: collection.request_id
      },
      message: `Updated collection **${collection.title}** (${collection.id}).`
    };
  })
  .build();
