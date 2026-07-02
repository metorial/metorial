import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStoresTool = SlateTool.create(spec, {
  name: 'List Stores',
  key: 'list_stores',
  description: `Retrieve your Lemon Squeezy stores. Returns store details including name, slug, domain, currency, and URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      stores: z.array(
        z.object({
          storeId: z.string(),
          name: z.string(),
          slug: z.string(),
          domain: z.string(),
          url: z.string(),
          currency: z.string(),
          totalSales: z.number(),
          totalRevenue: z.number(),
          thirtyDaySales: z.number(),
          thirtyDayRevenue: z.number(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listStores({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let stores = (response.data || []).map((store: any) => ({
      storeId: store.id,
      name: store.attributes.name,
      slug: store.attributes.slug,
      domain: store.attributes.domain,
      url: store.attributes.url,
      currency: store.attributes.currency,
      totalSales: store.attributes.total_sales,
      totalRevenue: store.attributes.total_revenue,
      thirtyDaySales: store.attributes.thirty_day_sales,
      thirtyDayRevenue: store.attributes.thirty_day_revenue,
      createdAt: store.attributes.created_at,
      updatedAt: store.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { stores, hasMore },
      message: `Found **${stores.length}** store(s).`
    };
  })
  .build();
