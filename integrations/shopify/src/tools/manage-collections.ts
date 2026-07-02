import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { shopifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let collectionSchema = z.object({
  collectionId: z.string(),
  title: z.string(),
  handle: z.string(),
  bodyHtml: z.string().nullable(),
  sortOrder: z.string().nullable(),
  collectionType: z.enum(['custom', 'smart']),
  publishedAt: z.string().nullable(),
  updatedAt: z.string()
});

export let manageCollections = SlateTool.create(spec, {
  name: 'Manage Collections',
  key: 'manage_collections',
  description: `List, create, update, or delete product collections. Supports both **custom** (manual) and **smart** (automated/rule-based) collections.
- **list**: List collections of a given type
- **get**: Get a single collection by ID
- **create**: Create a new collection
- **update**: Update an existing collection
- **delete**: Delete a collection`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      collectionType: z
        .enum(['custom', 'smart'])
        .optional()
        .describe('Type of collection (required for list/create)'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID (required for get/update/delete)'),
      title: z.string().optional().describe('Collection title (for create/update)'),
      bodyHtml: z
        .string()
        .optional()
        .describe('Collection description in HTML (for create/update)'),
      sortOrder: z
        .string()
        .optional()
        .describe(
          'Sort order: alpha-asc, alpha-desc, best-selling, created, created-desc, manual, price-asc, price-desc'
        ),
      published: z.boolean().optional().describe('Whether collection is published'),
      rules: z
        .array(
          z.object({
            column: z
              .string()
              .describe('Rule column: title, type, vendor, variant_price, tag, etc.'),
            relation: z
              .string()
              .describe(
                'Rule relation: equals, greater_than, less_than, starts_with, ends_with, contains'
              ),
            condition: z.string().describe('Rule condition value')
          })
        )
        .optional()
        .describe('Smart collection rules (only for smart collections)'),
      disjunctive: z
        .boolean()
        .optional()
        .describe(
          'Whether products must match any rule (true) or all rules (false) for smart collections'
        ),
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of results (for list action)')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSchema).optional(),
      collection: collectionSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let mapCollection = (c: any, type: 'custom' | 'smart') => ({
      collectionId: String(c.id),
      title: c.title,
      handle: c.handle,
      bodyHtml: c.body_html,
      sortOrder: c.sort_order,
      collectionType: type,
      publishedAt: c.published_at,
      updatedAt: c.updated_at
    });

    if (ctx.input.action === 'list') {
      let type = ctx.input.collectionType || 'custom';
      let params = { limit: ctx.input.limit };
      if (type === 'custom') {
        let collections = await client.listCustomCollections(params);
        return {
          output: { collections: collections.map((c: any) => mapCollection(c, 'custom')) },
          message: `Found **${collections.length}** custom collection(s).`
        };
      } else {
        let collections = await client.listSmartCollections(params);
        return {
          output: { collections: collections.map((c: any) => mapCollection(c, 'smart')) },
          message: `Found **${collections.length}** smart collection(s).`
        };
      }
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.collectionId) throw shopifyServiceError('collectionId is required');
      let type = ctx.input.collectionType || 'custom';
      let c =
        type === 'custom'
          ? await client.getCustomCollection(ctx.input.collectionId)
          : await client.getSmartCollection(ctx.input.collectionId);
      return {
        output: { collection: mapCollection(c, type) },
        message: `Retrieved ${type} collection **${c.title}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let type = ctx.input.collectionType || 'custom';
      let data: Record<string, any> = {};
      if (ctx.input.title) data.title = ctx.input.title;
      if (ctx.input.bodyHtml !== undefined) data.body_html = ctx.input.bodyHtml;
      if (ctx.input.sortOrder) data.sort_order = ctx.input.sortOrder;
      if (ctx.input.published !== undefined) data.published = ctx.input.published;

      if (type === 'smart') {
        if (ctx.input.rules) data.rules = ctx.input.rules;
        if (ctx.input.disjunctive !== undefined) data.disjunctive = ctx.input.disjunctive;
        let c = await client.createSmartCollection(data);
        return {
          output: { collection: mapCollection(c, 'smart') },
          message: `Created smart collection **${c.title}**.`
        };
      } else {
        let c = await client.createCustomCollection(data);
        return {
          output: { collection: mapCollection(c, 'custom') },
          message: `Created custom collection **${c.title}**.`
        };
      }
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.collectionId) throw shopifyServiceError('collectionId is required');
      let type = ctx.input.collectionType || 'custom';
      let data: Record<string, any> = {};
      if (ctx.input.title) data.title = ctx.input.title;
      if (ctx.input.bodyHtml !== undefined) data.body_html = ctx.input.bodyHtml;
      if (ctx.input.sortOrder) data.sort_order = ctx.input.sortOrder;
      if (ctx.input.published !== undefined) data.published = ctx.input.published;

      if (type === 'smart') {
        if (ctx.input.rules) data.rules = ctx.input.rules;
        if (ctx.input.disjunctive !== undefined) data.disjunctive = ctx.input.disjunctive;
        let c = await client.updateSmartCollection(ctx.input.collectionId, data);
        return {
          output: { collection: mapCollection(c, 'smart') },
          message: `Updated smart collection **${c.title}**.`
        };
      } else {
        let c = await client.updateCustomCollection(ctx.input.collectionId, data);
        return {
          output: { collection: mapCollection(c, 'custom') },
          message: `Updated custom collection **${c.title}**.`
        };
      }
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.collectionId) throw shopifyServiceError('collectionId is required');
      let type = ctx.input.collectionType || 'custom';
      if (type === 'custom') {
        await client.deleteCustomCollection(ctx.input.collectionId);
      } else {
        await client.deleteSmartCollection(ctx.input.collectionId);
      }
      return {
        output: { deleted: true },
        message: `Deleted ${type} collection **${ctx.input.collectionId}**.`
      };
    }

    throw shopifyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
