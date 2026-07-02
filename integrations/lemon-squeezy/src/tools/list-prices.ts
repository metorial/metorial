import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPricesTool = SlateTool.create(spec, {
  name: 'List Prices',
  key: 'list_prices',
  description:
    'Retrieve Lemon Squeezy price objects. Prices preserve historical pricing for variants and include pricing scheme, renewal interval, usage aggregation, setup fee, tiers, and tax code details.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      variantId: z.string().optional().describe('Filter prices by variant ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      prices: z.array(
        z.object({
          priceId: z.string(),
          variantId: z.number(),
          category: z.string(),
          scheme: z.string(),
          usageAggregation: z.string().nullable(),
          unitPrice: z.number().nullable(),
          unitPriceDecimal: z.string().nullable(),
          setupFeeEnabled: z.boolean(),
          setupFee: z.number().nullable(),
          packageSize: z.number().nullable(),
          tiers: z.array(z.record(z.string(), z.unknown())).nullable(),
          renewalIntervalUnit: z.string().nullable(),
          renewalIntervalQuantity: z.number().nullable(),
          trialIntervalUnit: z.string().nullable(),
          trialIntervalQuantity: z.number().nullable(),
          minPrice: z.number().nullable(),
          suggestedPrice: z.number().nullable(),
          taxCode: z.string().nullable(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listPrices({
      variantId: ctx.input.variantId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let prices = (response.data || []).map((price: any) => ({
      priceId: price.id,
      variantId: price.attributes.variant_id,
      category: price.attributes.category,
      scheme: price.attributes.scheme,
      usageAggregation: price.attributes.usage_aggregation,
      unitPrice: price.attributes.unit_price,
      unitPriceDecimal: price.attributes.unit_price_decimal,
      setupFeeEnabled: price.attributes.setup_fee_enabled,
      setupFee: price.attributes.setup_fee,
      packageSize: price.attributes.package_size,
      tiers: price.attributes.tiers,
      renewalIntervalUnit: price.attributes.renewal_interval_unit,
      renewalIntervalQuantity: price.attributes.renewal_interval_quantity,
      trialIntervalUnit: price.attributes.trial_interval_unit,
      trialIntervalQuantity: price.attributes.trial_interval_quantity,
      minPrice: price.attributes.min_price,
      suggestedPrice: price.attributes.suggested_price,
      taxCode: price.attributes.tax_code,
      createdAt: price.attributes.created_at,
      updatedAt: price.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { prices, hasMore },
      message: `Found **${prices.length}** price(s).`
    };
  })
  .build();
