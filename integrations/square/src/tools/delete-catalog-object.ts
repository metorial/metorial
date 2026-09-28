import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

export let deleteCatalogObject = SlateTool.create(spec, {
  name: 'Delete Catalog Object',
  key: 'delete_catalog_object',
  description: `Delete a catalog object by its ID. Deleting an item also deletes its variations. Deleted objects can still be referenced by existing orders.`,
  tags: { destructive: true }
})
  .scopes(allOf('ITEMS_WRITE'))
  .input(
    z.object({
      catalogObjectId: z.string().describe('The ID of the catalog object to delete')
    })
  )
  .output(
    z.object({
      deletedObjectIds: z.array(z.string()).describe('IDs of all deleted objects'),
      deletedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['ITEMS_WRITE']);
    let client = createClient(ctx.auth);
    let result = await client.deleteCatalogObject(ctx.input.catalogObjectId);

    return {
      output: {
        deletedObjectIds: result.deletedObjectIds,
        deletedAt: result.deletedAt
      },
      message: `Deleted **${result.deletedObjectIds.length}** catalog object(s): ${result.deletedObjectIds.join(', ')}`
    };
  })
  .build();
