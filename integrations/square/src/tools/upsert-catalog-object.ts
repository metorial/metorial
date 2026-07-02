import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';

export let upsertCatalogObject = SlateTool.create(spec, {
  name: 'Upsert Catalog Object',
  key: 'upsert_catalog_object',
  description: `Create or update a catalog object (item, variation, category, tax, discount, modifier list, etc.). Use a temporary ID starting with '#' for new objects. For updates, provide the existing object ID and current version.`,
  instructions: [
    'For new objects, use an ID starting with "#" (e.g., "#my-new-item"). Square will assign a permanent ID.',
    'For updates, include the existing object ID and the current version number.',
    'Item variations must be nested within item_data.variations for items.'
  ]
})
  .input(
    z.object({
      object: z
        .record(z.string(), z.any())
        .describe(
          'The catalog object to create or update. Must include "type" and "id" fields. See Square Catalog API docs for object structure'
        ),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicates. Auto-generated if omitted')
    })
  )
  .output(
    z.object({
      catalogObjectId: z.string().optional(),
      type: z.string().optional(),
      version: z.number().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let o = await client.upsertCatalogObject({
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey(),
      object: ctx.input.object
    });

    return {
      output: {
        catalogObjectId: o.id,
        type: o.type,
        version: o.version,
        updatedAt: o.updated_at
      },
      message: `Catalog object **${o.id}** (${o.type}) created/updated.`
    };
  })
  .build();
