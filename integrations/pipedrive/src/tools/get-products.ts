import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getProducts = SlateTool.create(spec, {
  name: 'Get Products',
  key: 'get_products',
  description: `Retrieve products from the Pipedrive product catalog. Fetch a single product by ID or list all products with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.number().optional().describe('Specific product ID to fetch'),
      start: z.number().optional().describe('Pagination start (0-based)'),
      limit: z.number().optional().describe('Number of results to return (max 500)')
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.number().describe('Product ID'),
            name: z.string().describe('Product name'),
            code: z.string().optional().nullable().describe('Product code'),
            unit: z.string().optional().nullable().describe('Unit'),
            tax: z.number().optional().describe('Tax %'),
            activeFlag: z.boolean().optional().describe('Whether active'),
            ownerName: z.string().optional().describe('Owner name'),
            addTime: z.string().optional().describe('Creation timestamp'),
            updateTime: z.string().optional().nullable().describe('Last update timestamp')
          })
        )
        .describe('List of products'),
      totalCount: z.number().optional().describe('Total matching count'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.productId) {
      let result = await client.getProduct(ctx.input.productId);
      let p = result?.data;
      return {
        output: {
          products: p
            ? [
                {
                  productId: p.id,
                  name: p.name,
                  code: p.code,
                  unit: p.unit,
                  tax: p.tax,
                  activeFlag: p.active_flag,
                  ownerName: p.owner_id?.name,
                  addTime: p.add_time,
                  updateTime: p.update_time
                }
              ]
            : [],
          totalCount: p ? 1 : 0
        },
        message: p ? `Found product **"${p.name}"** (ID: ${p.id}).` : 'Product not found.'
      };
    }

    let result = await client.getProducts({
      start: ctx.input.start,
      limit: ctx.input.limit
    });

    let products = (result?.data || []).map((p: any) => ({
      productId: p.id,
      name: p.name,
      code: p.code,
      unit: p.unit,
      tax: p.tax,
      activeFlag: p.active_flag,
      ownerName: p.owner_id?.name ?? p.owner_name,
      addTime: p.add_time,
      updateTime: p.update_time
    }));

    return {
      output: {
        products,
        totalCount: result?.additional_data?.pagination?.total_count,
        hasMore: result?.additional_data?.pagination?.more_items_in_collection ?? false
      },
      message: `Found **${products.length}** product(s).`
    };
  });
