import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { shopifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let metafieldResourcePaths: Record<string, string> = {
  collection: 'collections',
  customer: 'customers',
  draft_order: 'draft_orders',
  location: 'locations',
  order: 'orders',
  page: 'pages',
  product: 'products',
  product_image: 'product_images',
  product_variant: 'variants',
  shop: 'shop'
};

let metafieldSchema = z.object({
  metafieldId: z.string(),
  namespace: z.string(),
  key: z.string(),
  value: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().nullable(),
  ownerResource: z.string().nullable(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export let manageMetafields = SlateTool.create(spec, {
  name: 'Manage Metafields',
  key: 'manage_metafields',
  description: `List, retrieve, create, update, or delete metafields attached to Shopify resources. Use metafields for custom structured data such as specifications, internal IDs, operational notes, and storefront metadata.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      resourceType: z
        .enum([
          'collection',
          'customer',
          'draft_order',
          'location',
          'order',
          'page',
          'product',
          'product_image',
          'product_variant',
          'shop'
        ])
        .describe('Resource type that owns the metafield'),
      resourceId: z
        .string()
        .optional()
        .describe('Owner resource ID. Required for all resource types except shop.'),
      metafieldId: z
        .string()
        .optional()
        .describe('Metafield ID (required for get/update/delete)'),
      namespace: z.string().optional().describe('Metafield namespace'),
      key: z.string().optional().describe('Metafield key'),
      value: z
        .string()
        .optional()
        .describe('Metafield value. Shopify stores values as strings.'),
      type: z
        .string()
        .optional()
        .describe('Metafield type, such as single_line_text_field, number_integer, or json'),
      description: z.string().optional().describe('Optional metafield description'),
      limit: z.number().min(1).max(250).optional().describe('Number of metafields to return')
    })
  )
  .output(
    z.object({
      metafields: z.array(metafieldSchema).optional(),
      metafield: metafieldSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let resource = metafieldResourcePaths[ctx.input.resourceType];
    if (!resource) {
      throw shopifyServiceError(`Unsupported resourceType: ${ctx.input.resourceType}`);
    }

    let resourceId = ctx.input.resourceType === 'shop' ? undefined : ctx.input.resourceId;
    if (ctx.input.resourceType !== 'shop' && !resourceId) {
      throw shopifyServiceError('resourceId is required for this resourceType.');
    }

    let mapMetafield = (metafield: any) => ({
      metafieldId: String(metafield.id),
      namespace: metafield.namespace,
      key: metafield.key,
      value: String(metafield.value ?? ''),
      type: metafield.type,
      description: metafield.description ?? null,
      ownerId: metafield.owner_id == null ? null : String(metafield.owner_id),
      ownerResource: metafield.owner_resource ?? null,
      createdAt: metafield.created_at ?? null,
      updatedAt: metafield.updated_at ?? null
    });

    if (ctx.input.action === 'list') {
      let metafields = await client.listMetafields(resource, resourceId, {
        limit: ctx.input.limit,
        namespace: ctx.input.namespace
      });
      return {
        output: { metafields: metafields.map(mapMetafield) },
        message: `Found **${metafields.length}** metafield(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.metafieldId) throw shopifyServiceError('metafieldId is required.');
      let metafield = await client.getMetafield(resource, resourceId, ctx.input.metafieldId);
      return {
        output: { metafield: mapMetafield(metafield) },
        message: `Retrieved metafield **${metafield.namespace}.${metafield.key}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.namespace) throw shopifyServiceError('namespace is required.');
      if (!ctx.input.key) throw shopifyServiceError('key is required.');
      if (ctx.input.value === undefined) throw shopifyServiceError('value is required.');
      if (!ctx.input.type) throw shopifyServiceError('type is required.');

      let metafield = await client.createMetafield(resource, resourceId, {
        namespace: ctx.input.namespace,
        key: ctx.input.key,
        value: ctx.input.value,
        type: ctx.input.type,
        description: ctx.input.description
      });
      return {
        output: { metafield: mapMetafield(metafield) },
        message: `Created metafield **${metafield.namespace}.${metafield.key}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.metafieldId) throw shopifyServiceError('metafieldId is required.');
      if (ctx.input.value === undefined && ctx.input.type === undefined) {
        throw shopifyServiceError('Provide value or type to update a metafield.');
      }

      let data: Record<string, any> = {};
      if (ctx.input.value !== undefined) data.value = ctx.input.value;
      if (ctx.input.type !== undefined) data.type = ctx.input.type;

      let metafield = await client.updateMetafield(
        resource,
        resourceId,
        ctx.input.metafieldId,
        data
      );
      return {
        output: { metafield: mapMetafield(metafield) },
        message: `Updated metafield **${metafield.namespace}.${metafield.key}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.metafieldId) throw shopifyServiceError('metafieldId is required.');
      await client.deleteMetafield(resource, resourceId, ctx.input.metafieldId);
      return {
        output: { deleted: true },
        message: `Deleted metafield **${ctx.input.metafieldId}**.`
      };
    }

    throw shopifyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
