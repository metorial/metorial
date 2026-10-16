import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import {
  requiredId,
  requireValue,
  responseList,
  translationsBody,
  validatePagination
} from '../lib/response';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, delete, or list knowledge base collections. Collections organize articles into groups with support for nested parent/child hierarchies and multi-language translations.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      page: z.number().optional().describe('Page number for list'),
      perPage: z.number().optional().describe('Results per page for list (max: 60)'),
      collectionId: z.string().optional().describe('Collection ID (for get/update/delete)'),
      parentId: z.string().optional().describe('Parent collection ID for nesting'),
      defaultLocale: z.string().optional().describe('Default locale code'),
      translations: z
        .array(
          z.object({
            locale: z.string().describe('Locale code'),
            name: z.string().optional().describe('Collection name'),
            description: z.string().optional().describe('Collection description'),
            icon: z.string().optional().describe('Icon identifier')
          })
        )
        .optional()
        .describe('Collection translations')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      pages: z
        .any()
        .optional()
        .describe('Provider pagination metadata for the collection list'),
      collections: z
        .array(
          z.object({
            collectionId: z.string(),
            parentId: z.string().optional(),
            defaultLocale: z.string().optional(),
            translations: z.array(z.any()).optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      collection: z
        .object({
          collectionId: z.string(),
          parentId: z.string().optional(),
          defaultLocale: z.string().optional(),
          translations: z.array(z.any()).optional(),
          createdAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });

    let mapCollection = (c: any) => ({
      collectionId: requiredId(c.id),
      parentId: c.parent_id !== undefined ? String(c.parent_id) : undefined,
      defaultLocale: c.default_locale,
      translations: c.translations,
      createdAt: c.created_at !== undefined ? String(c.created_at) : undefined
    });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listCollections({
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        let collections = responseList(data.collections).map(mapCollection);
        return {
          output: { rawResponse: client.responses, collections, pages: data.pages },
          message: `Found **${collections.length}** collections.`
        };
      }

      case 'get': {
        if (!ctx.input.collectionId) throw createApiServiceError('collectionId is required');
        let data = await client.getCollection(ctx.input.collectionId);
        let collection = mapCollection(data.collection || data);
        return {
          output: { rawResponse: client.responses, collection },
          message: `Retrieved collection **${collection.collectionId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.translations?.length)
          throw createApiServiceError('Provide collection translations.');
        for (let translation of ctx.input.translations) {
          requireValue(translation.name, 'Translation name');
          requireValue(translation.description, 'Translation description');
          requireValue(translation.icon, 'Translation icon');
        }
        let body: Record<string, any> = {};
        if (ctx.input.parentId) body.parent_id = ctx.input.parentId;
        if (ctx.input.defaultLocale) body.default_locale = ctx.input.defaultLocale;
        if (ctx.input.translations)
          body.translations = translationsBody(ctx.input.translations);
        let data = await client.createCollection(body);
        let collection = mapCollection(data.collection || data);
        return {
          output: { rawResponse: client.responses, collection },
          message: `Created collection **${collection.collectionId}**.`
        };
      }

      case 'update': {
        if (!ctx.input.collectionId) throw createApiServiceError('collectionId is required');
        let body: Record<string, any> = {};
        if (ctx.input.parentId) body.parent_id = ctx.input.parentId;
        if (ctx.input.defaultLocale) body.default_locale = ctx.input.defaultLocale;
        if (ctx.input.translations)
          body.translations = translationsBody(ctx.input.translations);
        let data = await client.updateCollection(ctx.input.collectionId, body);
        let collection = mapCollection(data.collection || data);
        return {
          output: { rawResponse: client.responses, collection },
          message: `Updated collection **${ctx.input.collectionId}**.`
        };
      }

      case 'delete': {
        if (!ctx.input.collectionId) throw createApiServiceError('collectionId is required');
        await client.deleteCollection(ctx.input.collectionId);
        return {
          output: { rawResponse: client.responses, deleted: true },
          message: `Deleted collection **${ctx.input.collectionId}**.`
        };
      }
    }
  })
  .build();
