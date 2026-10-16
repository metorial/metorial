import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requireValue, responseList } from '../lib/response';
import { spec } from '../spec';

export let manageStore = SlateTool.create(spec, {
  name: 'Manage E-Commerce Store',
  key: 'manage_store',
  description: `Create, update, or list e-commerce store connections in Gist. Stores define the currency, abandoned cart interval, and auto-tagging settings for your e-commerce integration.`
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('Action to perform'),
      storeId: z.string().optional().describe('Store ID (for get/update)'),
      name: z.string().optional().describe('Store name'),
      domain: z.string().optional().describe('Store domain'),
      currency: z.string().optional().describe('Store currency code (e.g. "USD")'),
      abandonedCartInterval: z
        .number()
        .optional()
        .describe('Abandoned cart interval in minutes; converted to hours for Gist'),
      autoTagging: z
        .boolean()
        .optional()
        .describe('Legacy field; use contactTags to select tags for store contacts.'),
      contactTags: z
        .string()
        .optional()
        .describe('Comma-separated tags applied to store contacts'),
      status: z
        .enum(['connected', 'disconnected'])
        .optional()
        .describe('Whether store automations are active')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      stores: z
        .array(
          z.object({
            storeId: z.string(),
            name: z.string().optional(),
            domain: z.string().optional(),
            currency: z.string().optional()
          })
        )
        .optional(),
      store: z
        .object({
          storeId: z.string(),
          name: z.string().optional(),
          domain: z.string().optional(),
          currency: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    if (ctx.input.autoTagging !== undefined)
      throw createApiServiceError(
        'Gist requires explicit contactTags rather than an autoTagging boolean. Provide contactTags.'
      );
    let mapStore = (s: any) => ({
      storeId: requiredId(s.id),
      name: s.name,
      domain: s.domain,
      currency: s.currency
    });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listStores();
        let stores = responseList(data.stores).map(mapStore);
        return {
          output: { rawResponse: client.responses, stores },
          message: `Found **${stores.length}** stores.`
        };
      }

      case 'get': {
        if (!ctx.input.storeId) throw createApiServiceError('storeId is required');
        let data = await client.getStore(ctx.input.storeId);
        return {
          output: { rawResponse: client.responses, store: mapStore(data.store || data) },
          message: `Retrieved store **${ctx.input.storeId}**.`
        };
      }

      case 'create': {
        requireValue(ctx.input.name, 'Store name');
        requireValue(ctx.input.domain, 'Store domain');
        requireValue(ctx.input.currency, 'Store currency');
        let body: Record<string, any> = {};
        if (ctx.input.name) body.name = ctx.input.name;
        if (ctx.input.domain) body.domain = ctx.input.domain;
        if (ctx.input.currency) body.currency_code = ctx.input.currency;
        if (ctx.input.abandonedCartInterval !== undefined)
          body.abandon_cart_interval = ctx.input.abandonedCartInterval / 60;
        if (ctx.input.contactTags !== undefined) body.contact_tags = ctx.input.contactTags;
        if (ctx.input.status !== undefined) body.status = ctx.input.status;
        let data = await client.createStore(body);
        return {
          output: { rawResponse: client.responses, store: mapStore(data.store || data) },
          message: `Created store **${(data.store || data).name || (data.store || data).id}**.`
        };
      }

      case 'update': {
        if (!ctx.input.storeId) throw createApiServiceError('storeId is required');
        let body: Record<string, any> = {};
        if (ctx.input.name) body.name = ctx.input.name;
        if (ctx.input.domain) body.domain = ctx.input.domain;
        if (ctx.input.currency) body.currency_code = ctx.input.currency;
        if (ctx.input.abandonedCartInterval !== undefined)
          body.abandon_cart_interval = ctx.input.abandonedCartInterval / 60;
        if (ctx.input.contactTags !== undefined) body.contact_tags = ctx.input.contactTags;
        if (ctx.input.status !== undefined) body.status = ctx.input.status;
        let data = await client.updateStore(ctx.input.storeId, body);
        return {
          output: { rawResponse: client.responses, store: mapStore(data.store || data) },
          message: `Updated store **${ctx.input.storeId}**.`
        };
      }
    }
  })
  .build();
