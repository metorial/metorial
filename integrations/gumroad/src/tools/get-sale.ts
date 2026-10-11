import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { mapSaleSummary, saleSummaryFields } from './sale-utils';

export let getSale = SlateTool.create(spec, {
  name: 'Get Sale',
  key: 'get_sale',
  description: `Retrieve detailed information about a specific Gumroad sale, including buyer details, product info, and transaction amounts.`,
  tags: {
    readOnly: true
  }
})
  .scopes(gumroadActionScopes.viewSales)
  .input(
    z.object({
      saleId: z.string().describe('The sale ID to retrieve')
    })
  )
  .output(
    z.object({
      ...saleSummaryFields,
      productPermalink: z.string().optional().describe('Product permalink'),
      shipped: z.boolean().optional().describe('Whether the sale has been marked as shipped'),
      trackingUrl: z.string().optional().describe('Shipment tracking URL'),
      licenseKey: z.string().optional().describe('License key if applicable'),
      variants: z.any().optional().describe('Selected variant options'),
      customFields: z.any().optional().describe('Custom field values provided by the buyer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let s = await client.getSale(ctx.input.saleId);

    return {
      output: {
        ...mapSaleSummary(s),
        productPermalink: s.product_permalink || undefined,
        shipped: s.shipped ?? undefined,
        trackingUrl: s.tracking_url || undefined,
        licenseKey: s.license_key || undefined,
        variants: s.variants || undefined,
        customFields: s.custom_fields || undefined
      },
      message: `Retrieved sale **${s.id}** for product **${s.product_name || 'unknown'}**.`
    };
  })
  .build();
