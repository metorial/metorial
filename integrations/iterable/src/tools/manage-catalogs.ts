import { SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
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
      await client.createCatalog(ctx.input.catalogName!);
      return {
        output: {
          message: `Catalog "${ctx.input.catalogName}" created.`
        },
        message: `Created catalog **${ctx.input.catalogName}**.`
      };
    }

    if (ctx.input.action === 'deleteCatalog') {
      await client.deleteCatalog(ctx.input.catalogName!);
      return {
        output: {
          message: `Catalog "${ctx.input.catalogName}" deleted.`
        },
        message: `Deleted catalog **${ctx.input.catalogName}**.`
      };
    }

    if (ctx.input.action === 'listItems') {
      let result = await client.getCatalogItems(ctx.input.catalogName!, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let items =
        result.params?.catalogItemsWithProperties || result.catalogItemsWithProperties || [];
      return {
        output: {
          items,
          message: `Found ${items.length} item(s) in catalog "${ctx.input.catalogName}".`
        },
        message: `Retrieved **${items.length}** item(s) from catalog **${ctx.input.catalogName}**.`
      };
    }

    if (ctx.input.action === 'uploadItems') {
      await client.bulkUploadCatalogItems(
        ctx.input.catalogName!,
        ctx.input.items!,
        ctx.input.replaceUploadedFieldsOnly
      );
      let count = Object.keys(ctx.input.items!).length;
      return {
        output: {
          message: `Upload of ${count} item(s) to catalog "${ctx.input.catalogName}" accepted.`
        },
        message: `Uploaded **${count}** item(s) to catalog **${ctx.input.catalogName}**. The upload is processed asynchronously.`
      };
    }

    // deleteItems
    await client.deleteCatalogItems(ctx.input.catalogName!, ctx.input.itemIds!);
    return {
      output: {
        message: `Deleted ${ctx.input.itemIds!.length} item(s) from catalog "${ctx.input.catalogName}".`
      },
      message: `Deleted **${ctx.input.itemIds!.length}** item(s) from catalog **${ctx.input.catalogName}**.`
    };
  })
  .build();
