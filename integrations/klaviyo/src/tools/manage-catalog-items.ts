import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let manageCatalogItems = SlateTool.create(spec, {
  name: 'Manage Catalog Items',
  key: 'manage_catalog_items',
  description: `Create, retrieve, update, or delete product catalog items in Klaviyo. Catalog items power product recommendations, back-in-stock notifications, price-drop flows, and dynamic template content.
Also supports listing item variants and browsing categories.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'list_variants',
          'list_categories'
        ])
        .describe('Action to perform'),
      itemId: z
        .string()
        .optional()
        .describe('Catalog item ID (required for get, update, delete, list_variants)'),
      externalId: z
        .string()
        .optional()
        .describe(
          'External ID for the item (required for create, uses format "$custom:::$default:::EXTERNAL_ID")'
        ),
      title: z.string().optional().describe('Item title'),
      description: z.string().optional().describe('Item description'),
      url: z.string().optional().describe('Item URL'),
      imageUrl: z.string().optional().describe('Full-size image URL'),
      price: z.number().optional().describe('Item price'),
      catalogType: z.string().optional().describe('Catalog type (defaults to "$default")'),
      customMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata properties'),
      filter: z.string().optional().describe('Filter string for listing'),
      sort: z.string().optional().describe('Sort field'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            itemId: z.string().describe('Catalog item ID'),
            externalId: z.string().optional().describe('External ID'),
            title: z.string().optional().describe('Item title'),
            description: z.string().optional().describe('Item description'),
            url: z.string().optional().describe('Item URL'),
            imageUrl: z.string().optional().describe('Image URL'),
            price: z.number().optional().describe('Item price'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last updated timestamp')
          })
        )
        .optional()
        .describe('Catalog items'),
      categories: z
        .array(
          z.object({
            categoryId: z.string().describe('Category ID'),
            name: z.string().optional().describe('Category name'),
            externalId: z.string().optional().describe('External ID')
          })
        )
        .optional()
        .describe('Catalog categories'),
      variants: z
        .array(
          z.object({
            variantId: z.string().describe('Variant ID'),
            title: z.string().optional().describe('Variant title'),
            sku: z.string().optional().describe('SKU'),
            price: z.number().optional().describe('Variant price')
          })
        )
        .optional()
        .describe('Item variants'),
      success: z.boolean().describe('Whether the operation succeeded'),
      nextCursor: z.string().optional().describe('Pagination cursor'),
      hasMore: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, itemId, filter, sort, pageCursor, pageSize } = ctx.input;

    if (action === 'list') {
      let result = await client.getCatalogItems({ filter, sort, pageCursor, pageSize });
      let items = result.data.map(i => ({
        itemId: i.id ?? '',
        externalId: i.attributes?.external_id ?? undefined,
        title: i.attributes?.title ?? undefined,
        description: i.attributes?.description ?? undefined,
        url: i.attributes?.url ?? undefined,
        imageUrl: i.attributes?.image_full_url ?? undefined,
        price: i.attributes?.price ?? undefined,
        created: i.attributes?.created ?? undefined,
        updated: i.attributes?.updated ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { items, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${items.length}** catalog items`
      };
    }

    if (action === 'get') {
      if (!itemId) throw new Error('itemId is required');
      let result = await client.getCatalogItem(itemId);
      let i = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          items: [
            {
              itemId: i?.id ?? '',
              externalId: i?.attributes?.external_id,
              title: i?.attributes?.title,
              description: i?.attributes?.description,
              url: i?.attributes?.url,
              imageUrl: i?.attributes?.image_full_url,
              price: i?.attributes?.price,
              created: i?.attributes?.created,
              updated: i?.attributes?.updated
            }
          ],
          success: true
        },
        message: `Retrieved catalog item **${i?.attributes?.title ?? itemId}**`
      };
    }

    if (action === 'create') {
      let attributes: Record<string, any> = {};
      let catalogType = ctx.input.catalogType ?? '$default';
      if (ctx.input.externalId) attributes.external_id = ctx.input.externalId;
      if (ctx.input.title) attributes.title = ctx.input.title;
      if (ctx.input.description) attributes.description = ctx.input.description;
      if (ctx.input.url) attributes.url = ctx.input.url;
      if (ctx.input.imageUrl) attributes.image_full_url = ctx.input.imageUrl;
      if (ctx.input.price !== undefined) attributes.price = ctx.input.price;
      if (ctx.input.customMetadata) attributes.custom_metadata = ctx.input.customMetadata;
      attributes.catalog_type = catalogType;

      let result = await client.createCatalogItem(attributes);
      let i = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          items: [{ itemId: i?.id ?? '', title: i?.attributes?.title }],
          success: true
        },
        message: `Created catalog item **${ctx.input.title}**`
      };
    }

    if (action === 'update') {
      if (!itemId) throw new Error('itemId is required');
      let attributes: Record<string, any> = {};
      if (ctx.input.title) attributes.title = ctx.input.title;
      if (ctx.input.description) attributes.description = ctx.input.description;
      if (ctx.input.url) attributes.url = ctx.input.url;
      if (ctx.input.imageUrl) attributes.image_full_url = ctx.input.imageUrl;
      if (ctx.input.price !== undefined) attributes.price = ctx.input.price;
      if (ctx.input.customMetadata) attributes.custom_metadata = ctx.input.customMetadata;

      await client.updateCatalogItem(itemId, attributes);
      return {
        output: { success: true },
        message: `Updated catalog item **${itemId}**`
      };
    }

    if (action === 'delete') {
      if (!itemId) throw new Error('itemId is required');
      await client.deleteCatalogItem(itemId);
      return {
        output: { success: true },
        message: `Deleted catalog item **${itemId}**`
      };
    }

    if (action === 'list_variants') {
      if (!itemId) throw new Error('itemId is required');
      let result = await client.getCatalogVariants(itemId, { pageCursor, pageSize });
      let variants = result.data.map(v => ({
        variantId: v.id ?? '',
        title: v.attributes?.title ?? undefined,
        sku: v.attributes?.sku ?? undefined,
        price: v.attributes?.price ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { variants, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${variants.length}** variants for item **${itemId}**`
      };
    }

    if (action === 'list_categories') {
      let result = await client.getCatalogCategories({ filter, sort, pageCursor, pageSize });
      let categories = result.data.map(c => ({
        categoryId: c.id ?? '',
        name: c.attributes?.name ?? undefined,
        externalId: c.attributes?.external_id ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { categories, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${categories.length}** catalog categories`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
