import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { brazeServiceError, requireBrazeArray, requireBrazeString } from '../lib/errors';
import { spec } from '../spec';

let catalogFieldSchema = z.object({
  name: z.string().describe('Catalog field name'),
  type: z
    .string()
    .describe('Braze catalog field type, such as string, number, boolean, or time')
});

let requireFields = (value: Record<string, any> | undefined, action: string) => {
  if (value && Object.keys(value).length > 0) {
    return value;
  }

  throw brazeServiceError(`fields must contain at least one item for "${action}".`);
};

export let manageCatalogs = SlateTool.create(spec, {
  name: 'Manage Catalogs',
  key: 'manage_catalogs',
  description: `Create or delete Braze catalogs used for personalization. Use List Catalogs to inspect existing catalogs before destructive operations.`,
  instructions: [
    'Use action "create" with catalogName and fields to create a catalog.',
    'Use action "delete" with catalogName to delete a catalog.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Catalog operation to perform'),
      catalogName: z.string().optional().describe('Catalog name'),
      description: z.string().optional().describe('Catalog description'),
      fields: z
        .array(catalogFieldSchema)
        .optional()
        .describe('Catalog field definitions required for create')
    })
  )
  .output(
    z.object({
      catalogName: z.string().optional().describe('Catalog name'),
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let catalogName = requireBrazeString(
      ctx.input.catalogName,
      'catalogName',
      ctx.input.action
    );

    if (ctx.input.action === 'create') {
      let fields = requireBrazeArray(ctx.input.fields, 'fields', 'create');
      let result = await client.createCatalog({
        name: catalogName,
        description: ctx.input.description ?? '',
        fields
      });

      return {
        output: {
          catalogName,
          message: result.message
        },
        message: `Created catalog **${catalogName}**.`
      };
    }

    let result = await client.deleteCatalog(catalogName);
    return {
      output: {
        catalogName,
        message: result.message
      },
      message: `Deleted catalog **${catalogName}**.`
    };
  })
  .build();

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
      cursor: z.string().optional().describe('Pagination cursor for list action'),
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
        result = await client.listCatalogItems(ctx.input.catalogName, ctx.input.cursor);
        return {
          output: {
            items: result.items ?? [],
            message: result.message
          },
          message: `Listed **${(result.items ?? []).length}** item(s) from catalog **${ctx.input.catalogName}**.`
        };
      }
      case 'get': {
        let itemId = requireBrazeString(ctx.input.itemId, 'itemId', 'get');
        result = await client.getCatalogItem(ctx.input.catalogName, itemId);
        return {
          output: {
            items: result.items ? [result.items] : result.item ? [result.item] : [],
            message: result.message
          },
          message: `Retrieved item **${itemId}** from catalog **${ctx.input.catalogName}**.`
        };
      }
      case 'create': {
        let itemId = requireBrazeString(ctx.input.itemId, 'itemId', 'create');
        result = await client.createCatalogItem(
          ctx.input.catalogName,
          itemId,
          requireFields(ctx.input.fields, 'create')
        );
        return {
          output: {
            message: result.message
          },
          message: `Created item **${itemId}** in catalog **${ctx.input.catalogName}**.`
        };
      }
      case 'update': {
        let itemId = requireBrazeString(ctx.input.itemId, 'itemId', 'update');
        result = await client.updateCatalogItem(
          ctx.input.catalogName,
          itemId,
          requireFields(ctx.input.fields, 'update')
        );
        return {
          output: {
            message: result.message
          },
          message: `Updated item **${itemId}** in catalog **${ctx.input.catalogName}**.`
        };
      }
      case 'delete': {
        let itemId = requireBrazeString(ctx.input.itemId, 'itemId', 'delete');
        result = await client.deleteCatalogItem(ctx.input.catalogName, itemId);
        return {
          output: {
            message: result.message
          },
          message: `Deleted item **${itemId}** from catalog **${ctx.input.catalogName}**.`
        };
      }
    }
  })
  .build();
