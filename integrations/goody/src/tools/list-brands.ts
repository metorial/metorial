import { SlateTool } from 'slates';
import { z } from 'zod';
import { createGoodyClient } from '../lib/client';
import { spec } from '../spec';

export let listBrands = SlateTool.create(spec, {
  name: 'List Brands',
  key: 'list_brands',
  description:
    'Browse active gifting brands, shipping costs, values, and product sets. Filter by shipping country before choosing products to send.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number starting at 1'),
      perPage: z.number().optional().describe('Items per page from 1 to 100; defaults to 20'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter shipping country code; defaults to US')
    })
  )
  .output(
    z.object({
      brands: z.array(
        z.object({
          brandId: z.string().describe('Brand ID'),
          name: z.string().describe('Brand name'),
          shippingPrice: z
            .number()
            .nullable()
            .describe('Shipping cost in cents when supplied'),
          freeShippingMinimum: z
            .number()
            .nullable()
            .describe('Combined brand product cost for free shipping, in cents'),
          values: z.array(z.string()).describe('Brand values and attributes'),
          details: z
            .record(z.string(), z.unknown())
            .describe('Complete brand details, including product sets and their products')
        })
      ),
      totalCount: z.number().describe('Total number of matching brands')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createGoodyClient(ctx).listBrands(ctx.input);
    let brands = (result.data ?? []).map(
      (brand: {
        id: string;
        name: string;
        shipping_price?: number;
        free_shipping_minimum?: number | null;
        brand_values?: string[];
        [key: string]: unknown;
      }) => ({
        brandId: brand.id,
        name: brand.name,
        shippingPrice: brand.shipping_price ?? null,
        freeShippingMinimum: brand.free_shipping_minimum ?? null,
        values: brand.brand_values ?? [],
        details: brand
      })
    );
    return {
      output: { brands, totalCount: result.list_meta?.total_count ?? brands.length },
      message: `Returned **${brands.length}** brand(s) on this page.`
    };
  })
  .build();
