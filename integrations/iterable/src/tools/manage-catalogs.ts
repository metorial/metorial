import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { requireArrayField, requireField, requireRecordField } from '../lib/validation';
import { spec } from '../spec';

export let manageCatalogs = SlateTool.create(spec, {
  name: 'Manage Catalogs',
  key: 'manage_catalogs',
  description: `Create, list, or delete catalogs and their items in Iterable. Catalogs store collections of items (e.g. products) that can be referenced in templates for personalization. Supports bulk uploading up to 1,000 items at a time.`,
  constraints: [
    'Each catalog item has a maximum size of 30KB.',
    'Bulk uploads support up to 1,000 items per request.',
    'Catalog item uploads are asynchronous — a 202 response means the request was accepted.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'listCatalogs',
          'createCatalog',
          'deleteCatalog',
          'listItems',
          'getItem',
          'uploadItems',
          'deleteItems'
        ])
        .describe('Operation to perform'),
      catalogName: z
        .string()
        .optional()
        .describe('Catalog name (required for all item operations and create/delete catalog)'),
      items: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Items to upload. Object where keys are item IDs and values are item field objects (for uploadItems)'
        ),
      itemId: z.string().optional().describe('Item ID to retrieve (for getItem)'),
      itemIds: z.array(z.string()).optional().describe('Item IDs to delete (for deleteItems)'),
      replaceUploadedFieldsOnly: z
        .boolean()
        .optional()
        .describe('If true, only replaces fields included in the upload (for uploadItems)'),
      page: z.number().optional().describe('Page number for listing items'),
      pageSize: z.number().optional().describe('Page size for listing items')
    })
  )
  .output(
    z.object({
      catalogs: z
        .array(
          z.object({
            name: z.string().describe('Catalog name'),
            createdAt: z.string().optional().describe('When the catalog was created')
          })
        )
        .optional()
        .describe('List of catalogs'),
      items: z.array(z.record(z.string(), z.any())).optional().describe('Catalog items'),
      item: z.record(z.string(), z.any()).optional().describe('Catalog item details'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    if (ctx.input.action === 'listCatalogs') {
      let result = await client.getCatalogs();
      let catalogs = (result.params?.catalogNames || result.catalogNames || []).map(
        (name: string) => ({
          name,
          createdAt: undefined
        })
      );
      return {
        output: {
          catalogs,
          message: `Found ${catalogs.length} catalog(s).`
        },
        message: `Retrieved **${catalogs.length}** catalog(s).`
      };
    }

    if (ctx.input.action === 'createCatalog') {
      let catalogName = requireField(ctx.input.catalogName, 'catalogName');
      await client.createCatalog(catalogName);
      return {
        output: {
          message: `Catalog "${catalogName}" created.`
        },
        message: `Created catalog **${catalogName}**.`
      };
    }

    if (ctx.input.action === 'deleteCatalog') {
      let catalogName = requireField(ctx.input.catalogName, 'catalogName');
      await client.deleteCatalog(catalogName);
      return {
        output: {
          message: `Catalog "${catalogName}" deleted.`
        },
        message: `Deleted catalog **${catalogName}**.`
      };
    }

    if (ctx.input.action === 'listItems') {
      let catalogName = requireField(ctx.input.catalogName, 'catalogName');
      let result = await client.getCatalogItems(catalogName, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let items =
        result.params?.catalogItemsWithProperties || result.catalogItemsWithProperties || [];
      return {
        output: {
          items,
          message: `Found ${items.length} item(s) in catalog "${catalogName}".`
        },
        message: `Retrieved **${items.length}** item(s) from catalog **${catalogName}**.`
      };
    }

    if (ctx.input.action === 'getItem') {
      let catalogName = requireField(ctx.input.catalogName, 'catalogName');
      let itemId = requireField(ctx.input.itemId, 'itemId');
      let item = await client.getCatalogItem(catalogName, itemId);
      return {
        output: {
          item,
          message: `Retrieved item "${itemId}" from catalog "${catalogName}".`
        },
        message: `Retrieved item **${itemId}** from catalog **${catalogName}**.`
      };
    }

    if (ctx.input.action === 'uploadItems') {
      let catalogName = requireField(ctx.input.catalogName, 'catalogName');
      let items = requireRecordField(ctx.input.items, 'items');
      await client.bulkUploadCatalogItems(
        catalogName,
        items,
        ctx.input.replaceUploadedFieldsOnly
      );
      let count = Object.keys(items).length;
      return {
        output: {
          message: `Upload of ${count} item(s) to catalog "${catalogName}" accepted.`
        },
        message: `Uploaded **${count}** item(s) to catalog **${catalogName}**. The upload is processed asynchronously.`
      };
    }

    // deleteItems
    let catalogName = requireField(ctx.input.catalogName, 'catalogName');
    let itemIds = requireArrayField(ctx.input.itemIds, 'itemIds');
    await client.deleteCatalogItems(catalogName, itemIds);
    return {
      output: {
        message: `Deleted ${itemIds.length} item(s) from catalog "${catalogName}".`
      },
      message: `Deleted **${itemIds.length}** item(s) from catalog **${catalogName}**.`
    };
  })
  .build();
