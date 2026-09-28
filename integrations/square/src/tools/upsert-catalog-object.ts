import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

export let upsertCatalogObject = SlateTool.create(spec, {
  name: 'Upsert Catalog Object',
  key: 'upsert_catalog_object',
  description: `Create or fully replace a catalog object (item, variation, category, tax, discount, modifier list, etc.). Omitted fields and nested children are cleared on update. Use a temporary ID starting with '#' for new objects.`,
  instructions: [
    'For new objects, use an ID starting with "#" (e.g., "#my-new-item"). Square will assign a permanent ID.',
    'For updates, retrieve the object, modify the full object, and include its current version. Omitted fields and nested variations are removed.',
    'Item variations must be nested within item_data.variations for items.'
  ]
})
  .scopes(allOf('ITEMS_WRITE'))
  .input(
    z.object({
      object: z
        .record(z.string(), z.any())
        .describe(
          'The catalog object to create or update. Must include "type" and "id" fields. See Square Catalog API docs for object structure'
        ),
      idempotencyKey: z
        .string()
        .min(1)
        .max(128)
        .optional()
        .describe('Unique key to prevent duplicates. Auto-generated if omitted')
    })
  )
  .output(
    z.object({
      catalogObjectId: z.string().optional(),
      type: z.string().optional(),
      version: z.number().optional(),
      updatedAt: z.string().optional(),
      idMappings: z
        .array(
          z.object({
            clientObjectId: z.string().optional(),
            objectId: z.string().optional()
          })
        )
        .describe('Temporary IDs mapped to permanent Square catalog object IDs')
    })
  )
  .handleInvocation(async ctx => {
    if (
      typeof ctx.input.object.type !== 'string' ||
      !ctx.input.object.type ||
      typeof ctx.input.object.id !== 'string' ||
      !ctx.input.object.id
    ) {
      throw squareServiceError('Catalog object requires nonempty type and id fields.');
    }
    if (
      !ctx.input.object.id.startsWith('#') &&
      (!Number.isInteger(ctx.input.object.version) || ctx.input.object.version < 0)
    ) {
      throw squareServiceError(
        'Updating a catalog object requires its current nonnegative integer version.'
      );
    }
    requireSquareScopes(ctx.auth, ['ITEMS_WRITE']);
    let client = createClient(ctx.auth);
    let result = await client.upsertCatalogObject({
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey(),
      object: ctx.input.object
    });
    let o = result.object;

    return {
      output: {
        catalogObjectId: o.id,
        type: o.type,
        version: o.version,
        updatedAt: o.updated_at,
        idMappings: result.idMappings
      },
      message: `Catalog object **${o.id}** (${o.type}) created/updated.`
    };
  })
  .build();
