import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProductsTool = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve products from your Lemon Squeezy store. Supports filtering by store and pagination. Returns product name, description, pricing, status, and URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter by store ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      products: z.array(
        z.object({
          productId: z.string(),
          storeId: z.number(),
          name: z.string(),
          slug: z.string(),
          description: z.string().nullable(),
          status: z.string(),
          statusFormatted: z.string(),
          thumbUrl: z.string().nullable(),
          price: z.number(),
          priceFormatted: z.string(),
          fromPrice: z.number().nullable(),
          toPrice: z.number().nullable(),
          buyNowUrl: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listProducts({
      storeId: ctx.input.storeId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let products = (response.data || []).map((product: any) => ({
      productId: product.id,
      storeId: product.attributes.store_id,
      name: product.attributes.name,
      slug: product.attributes.slug,
      description: product.attributes.description,
      status: product.attributes.status,
      statusFormatted: product.attributes.status_formatted,
      thumbUrl: product.attributes.thumb_url,
      price: product.attributes.price,
      priceFormatted: product.attributes.price_formatted,
      fromPrice: product.attributes.from_price,
      toPrice: product.attributes.to_price,
      buyNowUrl: product.attributes.buy_now_url,
      createdAt: product.attributes.created_at,
      updatedAt: product.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { products, hasMore },
      message: `Found **${products.length}** product(s).`
    };
  })
  .build();
