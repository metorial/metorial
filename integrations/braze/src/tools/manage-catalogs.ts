import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let listCatalogs = SlateTool.create(spec, {
  name: 'List Catalogs',
  key: 'list_catalogs',
  description: `List all product catalogs in your Braze workspace. Returns catalog names, descriptions, and field definitions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      catalogs: z.array(z.record(z.string(), z.any())).describe('List of catalogs'),
      message: z.string().describe('Response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result = await client.listCatalogs();

    return {
      output: {
        catalogs: result.catalogs ?? [],
        message: result.message
      },
      message: `Found **${(result.catalogs ?? []).length}** catalog(s).`
    };
  })
  .build();

export let manageCatalogItems = SlateTool.create(spec, {
  name: 'Manage Catalog Items',
  key: 'manage_catalog_items',
  description: `Create, read, update, or delete items in a Braze catalog. Supports single item operations for managing product catalog data used in personalization.`,
  instructions: [
    'Set the action to "get" to retrieve, "create" to add, "update" to modify, or "delete" to remove an item.',
    'For "list", omit the itemId to retrieve all items in the catalog.'
  ],
  constraints: ['Synchronous item operations are rate limited to 50 requests per minute.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform on catalog items'),
      catalogName: z.string().describe('Name of the catalog to operate on'),
      itemId: z
        .string()
        .optional()
        .describe('ID of the catalog item (required for get, create, update, delete)'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Item field values (required for create and update)')
    })
  )
  .output(
    z.object({
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Retrieved catalog items'),
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let result: any;

    switch (ctx.input.action) {
      case 'list': {
        result = await client.listCatalogItems(ctx.input.catalogName);
        return {
          output: {
            items: result.items ?? [],
            message: result.message
          },
          message: `Listed **${(result.items ?? []).length}** item(s) from catalog **${ctx.input.catalogName}**.`
        };
      }
      case 'get': {
        result = await client.getCatalogItem(ctx.input.catalogName, ctx.input.itemId!);
        return {
          output: {
            items: result.items ? [result.items] : result.item ? [result.item] : [],
            message: result.message
          },
          message: `Retrieved item **${ctx.input.itemId}** from catalog **${ctx.input.catalogName}**.`
        };
      }
      case 'create': {
        result = await client.createCatalogItem(
          ctx.input.catalogName,
          ctx.input.itemId!,
          ctx.input.fields ?? {}
        );
        return {
          output: {
            message: result.message
          },
          message: `Created item **${ctx.input.itemId}** in catalog **${ctx.input.catalogName}**.`
        };
      }
      case 'update': {
        result = await client.updateCatalogItem(
          ctx.input.catalogName,
          ctx.input.itemId!,
          ctx.input.fields ?? {}
        );
        return {
          output: {
            message: result.message
          },
          message: `Updated item **${ctx.input.itemId}** in catalog **${ctx.input.catalogName}**.`
        };
      }
      case 'delete': {
        result = await client.deleteCatalogItem(ctx.input.catalogName, ctx.input.itemId!);
        return {
          output: {
            message: result.message
          },
          message: `Deleted item **${ctx.input.itemId}** from catalog **${ctx.input.catalogName}**.`
        };
      }
    }
  })
  .build();
