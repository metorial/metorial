import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

export let productChange = SlateTrigger.create(spec, {
  name: 'Product Change',
  key: 'product_change',
  description:
    'Triggers when a product is created or updated in the catalog. Polls the product list and detects changes based on the updated_at timestamp.'
})
  .input(
    z.object({
      productId: z.number().describe('Product entity ID'),
      sku: z.string().describe('Product SKU'),
      name: z.string().optional().describe('Product name'),
      price: z.number().optional().describe('Product price'),
      status: z.number().optional().describe('Product status'),
      typeId: z.string().optional().describe('Product type'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      isNew: z.boolean().describe('Whether this is a newly created product')
    })
  )
  .output(
    z.object({
      productId: z.number().describe('Product entity ID'),
      sku: z.string().describe('Product SKU'),
      name: z.string().optional().describe('Product name'),
      price: z.number().optional().describe('Product price'),
      status: z.number().optional().describe('Product status (1=enabled, 2=disabled)'),
      visibility: z.number().optional().describe('Product visibility'),
      typeId: z.string().optional().describe('Product type'),
      weight: z.number().optional().describe('Product weight'),
      attributeSetId: z.number().optional().describe('Attribute set ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      customAttributes: z
        .array(
          z.object({
            attributeCode: z.string().describe('Attribute code'),
            value: z.any().describe('Attribute value')
          })
        )
        .optional()
        .describe('Custom product attributes')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MagentoClient({
        storeUrl: ctx.config.storeUrl,
        storeCode: ctx.config.storeCode,
        token: ctx.auth.token
      });

      let state = ctx.state as {
        lastUpdatedAt?: string;
        knownProducts?: Record<string, string>;
      } | null;
      let lastUpdatedAt = state?.lastUpdatedAt;
      let knownProducts = state?.knownProducts || {};

      let filters: Array<{ field: string; value: string; conditionType?: string }> = [];
      if (lastUpdatedAt) {
        filters.push({ field: 'updated_at', value: lastUpdatedAt, conditionType: 'gt' });
      }

      let result = await client.searchProducts({
        filters,
        sortField: 'updated_at',
        sortDirection: 'ASC',
        pageSize: 50
      });

      let inputs: Array<{
        productId: number;
        sku: string;
        name?: string;
        price?: number;
        status?: number;
        typeId?: string;
        createdAt?: string;
        updatedAt?: string;
        isNew: boolean;
      }> = [];

      let newLastUpdatedAt = lastUpdatedAt;
      let updatedKnown = { ...knownProducts };

      for (let product of result.items) {
        let productIdStr = String(product.id);
        let previousUpdatedAt = knownProducts[productIdStr];
        let isNew = previousUpdatedAt === undefined;

        if (previousUpdatedAt !== undefined && previousUpdatedAt === product.updated_at) {
          continue;
        }

        inputs.push({
          productId: product.id!,
          sku: product.sku,
          name: product.name,
          price: product.price,
          status: product.status,
          typeId: product.type_id,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
          isNew
        });

        updatedKnown[productIdStr] = product.updated_at || '';
        if (
          product.updated_at &&
          (!newLastUpdatedAt || product.updated_at > newLastUpdatedAt)
        ) {
          newLastUpdatedAt = product.updated_at;
        }
      }

      return {
        inputs,
        updatedState: {
          lastUpdatedAt: newLastUpdatedAt,
          knownProducts: updatedKnown
        }
      };
    },

    handleEvent: async ctx => {
      let client = new MagentoClient({
        storeUrl: ctx.config.storeUrl,
        storeCode: ctx.config.storeCode,
        token: ctx.auth.token
      });

      let fullProduct: any = {};
      try {
        fullProduct = await client.getProduct(ctx.input.sku);
      } catch {
        // Use data from poll if full fetch fails
      }

      let eventType = ctx.input.isNew ? 'product.created' : 'product.updated';

      return {
        type: eventType,
        id: `product-${ctx.input.productId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          productId: ctx.input.productId,
          sku: ctx.input.sku,
          name: ctx.input.name || fullProduct.name,
          price: ctx.input.price ?? fullProduct.price,
          status: ctx.input.status ?? fullProduct.status,
          visibility: fullProduct.visibility,
          typeId: ctx.input.typeId || fullProduct.type_id,
          weight: fullProduct.weight,
          attributeSetId: fullProduct.attribute_set_id,
          createdAt: ctx.input.createdAt || fullProduct.created_at,
          updatedAt: ctx.input.updatedAt || fullProduct.updated_at,
          customAttributes: fullProduct.custom_attributes?.map((a: any) => ({
            attributeCode: a.attribute_code,
            value: a.value
          }))
        }
      };
    }
  })
  .build();
