import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
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
        .describe('Abandoned cart interval in minutes'),
      autoTagging: z.boolean().optional().describe('Enable auto-tagging')
    })
  )
  .output(
    z.object({
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

    let mapStore = (s: any) => ({
      storeId: String(s.id),
      name: s.name,
      domain: s.domain,
      currency: s.currency
    });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listStores();
        let stores = (data.stores || []).map(mapStore);
        return {
          output: { stores },
          message: `Found **${stores.length}** stores.`
        };
      }

      case 'get': {
        if (!ctx.input.storeId) throw new Error('storeId is required');
        let data = await client.getStore(ctx.input.storeId);
        return {
          output: { store: mapStore(data.store || data) },
          message: `Retrieved store **${ctx.input.storeId}**.`
        };
      }

      case 'create': {
        let body: Record<string, any> = {};
        if (ctx.input.name) body.name = ctx.input.name;
        if (ctx.input.domain) body.domain = ctx.input.domain;
        if (ctx.input.currency) body.currency = ctx.input.currency;
        if (ctx.input.abandonedCartInterval !== undefined)
          body.abandoned_cart_interval = ctx.input.abandonedCartInterval;
        if (ctx.input.autoTagging !== undefined) body.auto_tagging = ctx.input.autoTagging;
        let data = await client.createStore(body);
        return {
          output: { store: mapStore(data.store || data) },
          message: `Created store **${(data.store || data).name || (data.store || data).id}**.`
        };
      }

      case 'update': {
        if (!ctx.input.storeId) throw new Error('storeId is required');
        let body: Record<string, any> = {};
        if (ctx.input.name) body.name = ctx.input.name;
        if (ctx.input.domain) body.domain = ctx.input.domain;
        if (ctx.input.currency) body.currency = ctx.input.currency;
        if (ctx.input.abandonedCartInterval !== undefined)
          body.abandoned_cart_interval = ctx.input.abandonedCartInterval;
        if (ctx.input.autoTagging !== undefined) body.auto_tagging = ctx.input.autoTagging;
        let data = await client.updateStore(ctx.input.storeId, body);
        return {
          output: { store: mapStore(data.store || data) },
          message: `Updated store **${ctx.input.storeId}**.`
        };
      }
    }
  })
  .build();
