import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVariantsTool = SlateTool.create(spec, {
  name: 'List Variants',
  key: 'list_variants',
  description: `Retrieve product variants (pricing tiers/configurations) from your store. Supports filtering by product ID. Returns variant name, price, intervals, and availability.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().optional().describe('Filter variants by product ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      variants: z.array(
        z.object({
          variantId: z.string(),
          productId: z.number(),
          name: z.string(),
          slug: z.string(),
          description: z.string().nullable(),
          price: z.number(),
          priceFormatted: z.string().nullable(),
          isSubscription: z.boolean(),
          interval: z.string().nullable(),
          intervalCount: z.number().nullable(),
          hasFreeTrial: z.boolean(),
          trialInterval: z.string().nullable(),
          trialIntervalCount: z.number().nullable(),
          status: z.string(),
          statusFormatted: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listVariants({
      productId: ctx.input.productId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let variants = (response.data || []).map((variant: any) => ({
      variantId: variant.id,
      productId: variant.attributes.product_id,
      name: variant.attributes.name,
      slug: variant.attributes.slug,
      description: variant.attributes.description,
      price: variant.attributes.price,
      priceFormatted: variant.attributes.price_formatted,
      isSubscription: variant.attributes.is_subscription,
      interval: variant.attributes.interval,
      intervalCount: variant.attributes.interval_count,
      hasFreeTrial: variant.attributes.has_free_trial,
      trialInterval: variant.attributes.trial_interval,
      trialIntervalCount: variant.attributes.trial_interval_count,
      status: variant.attributes.status,
      statusFormatted: variant.attributes.status_formatted,
      createdAt: variant.attributes.created_at,
      updatedAt: variant.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { variants, hasMore },
      message: `Found **${variants.length}** variant(s).`
    };
  })
  .build();
