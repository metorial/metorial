import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

let storeSchema = z.object({
  storeId: z.string().describe('Store ID'),
  name: z.string().describe('Store name'),
  defaultCurrency: z.string().optional().describe('Default currency (e.g., USD, BTC)'),
  networkFeeMode: z.string().optional().describe('Network fee mode'),
  speedPolicy: z.string().optional().describe('Transaction speed policy'),
  website: z.string().optional().nullable().describe('Store website URL')
});

export let manageStores = SlateTool.create(spec, {
  name: 'Manage Stores',
  key: 'manage_stores',
  description: `Create, list, retrieve, update, or delete stores on a BTCPay Server instance. Each store operates as an independent tenant with its own settings, payment methods, and wallets.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      storeId: z.string().optional().describe('Store ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Store name (required for create, optional for update)'),
      defaultCurrency: z
        .string()
        .optional()
        .describe('Default currency code (e.g., USD, BTC)'),
      networkFeeMode: z
        .enum(['MultiplePaymentsOnly', 'Always', 'Never'])
        .optional()
        .describe('Network fee mode'),
      speedPolicy: z
        .enum(['HighSpeed', 'MediumSpeed', 'LowSpeed', 'LowMediumSpeed'])
        .optional()
        .describe('Transaction speed policy'),
      website: z.string().optional().describe('Store website URL')
    })
  )
  .output(
    z.object({
      store: storeSchema.optional().describe('Store details (for get, create, update)'),
      stores: z.array(storeSchema).optional().describe('List of stores (for list)'),
      deleted: z.boolean().optional().describe('Whether the store was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let stores = await client.getStores();
      let mapped = stores.map(s => ({
        storeId: s.id as string,
        name: s.name as string,
        defaultCurrency: s.defaultCurrency as string | undefined,
        networkFeeMode: s.networkFeeMode as string | undefined,
        speedPolicy: s.speedPolicy as string | undefined,
        website: s.website as string | undefined
      }));
      return {
        output: { stores: mapped },
        message: `Found **${mapped.length}** store(s).`
      };
    }

    if (action === 'get') {
      let store = await client.getStore(ctx.input.storeId!);
      return {
        output: {
          store: {
            storeId: store.id as string,
            name: store.name as string,
            defaultCurrency: store.defaultCurrency as string | undefined,
            networkFeeMode: store.networkFeeMode as string | undefined,
            speedPolicy: store.speedPolicy as string | undefined,
            website: store.website as string | undefined
          }
        },
        message: `Retrieved store **${store.name}**.`
      };
    }

    if (action === 'create') {
      let store = await client.createStore({
        name: ctx.input.name!,
        defaultCurrency: ctx.input.defaultCurrency,
        networkFeeMode: ctx.input.networkFeeMode,
        speedPolicy: ctx.input.speedPolicy
      });
      return {
        output: {
          store: {
            storeId: store.id as string,
            name: store.name as string,
            defaultCurrency: store.defaultCurrency as string | undefined,
            networkFeeMode: store.networkFeeMode as string | undefined,
            speedPolicy: store.speedPolicy as string | undefined,
            website: store.website as string | undefined
          }
        },
        message: `Created store **${store.name}** (${store.id}).`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.defaultCurrency !== undefined)
        updateData.defaultCurrency = ctx.input.defaultCurrency;
      if (ctx.input.networkFeeMode !== undefined)
        updateData.networkFeeMode = ctx.input.networkFeeMode;
      if (ctx.input.speedPolicy !== undefined) updateData.speedPolicy = ctx.input.speedPolicy;
      if (ctx.input.website !== undefined) updateData.website = ctx.input.website;
      let store = await client.updateStore(ctx.input.storeId!, updateData);
      return {
        output: {
          store: {
            storeId: store.id as string,
            name: store.name as string,
            defaultCurrency: store.defaultCurrency as string | undefined,
            networkFeeMode: store.networkFeeMode as string | undefined,
            speedPolicy: store.speedPolicy as string | undefined,
            website: store.website as string | undefined
          }
        },
        message: `Updated store **${store.name}**.`
      };
    }

    // delete
    await client.deleteStore(ctx.input.storeId!);
    return {
      output: { deleted: true },
      message: `Deleted store **${ctx.input.storeId}**.`
    };
  })
  .build();
