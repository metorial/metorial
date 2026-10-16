import { SlateTool } from 'slates';
import { z } from 'zod';
import { BestBuyClient } from '../lib/client';
import { spec } from '../spec';

export let checkAvailability = SlateTool.create(spec, {
  name: 'Check In-Store Availability',
  key: 'check_availability',
  description: `Check near real-time in-store availability of a product at Best Buy stores. Query by SKU with either a postal code or specific store ID. Returns stores carrying the product with stock status, distance, and pickup time estimates.`,
  instructions: [
    'Provide either postalCode or storeId to locate stores.',
    'When using postalCode, stores within a 250-mile radius are returned, ordered by proximity.',
    'Use search_stores to discover store IDs. Only stores with the product in stock are returned.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sku: z.string().describe('Best Buy product SKU to check availability for'),
      postalCode: z
        .string()
        .optional()
        .describe('US postal code to find nearby stores with this product'),
      storeId: z
        .string()
        .optional()
        .describe('Specific Best Buy store ID from search_stores to check availability at')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of stores with availability information'),
      ispuEligible: z
        .boolean()
        .optional()
        .describe('Whether the product is eligible for in-store pickup'),
      stores: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Array of store availability objects including stock status and pickup estimates'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BestBuyClient({ token: ctx.auth.token });

    let result = await client.checkStoreAvailability({
      sku: ctx.input.sku,
      postalCode: ctx.input.postalCode,
      storeId: ctx.input.storeId
    });

    let storeCount = result.stores.length;
    return {
      output: {
        total: storeCount,
        stores: result.stores,
        ispuEligible: result.ispuEligible
      },
      message: client.redactMessage(
        `Found availability information at **${storeCount}** stores for SKU ${ctx.input.sku}.`
      )
    };
  })
  .build();
