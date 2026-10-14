import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Lists one page of products in your MailBluster brand. Returns product IDs, names, timestamps, and pagination details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageNo: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .positive()
        .optional()
        .describe('Page number for pagination. Defaults to 1.'),
      perPage: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .positive()
        .optional()
        .describe('Number of products per page. Defaults to 10.')
    })
  )
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.string().describe('ID of the product'),
            name: z.string().describe('Name of the product'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of products'),
      meta: z
        .object({
          total: z.number(),
          prevPageNo: z.number().nullable(),
          pageNo: z.number(),
          nextPageNo: z.number().nullable(),
          perPage: z.number(),
          totalPage: z.number()
        })
        .describe('Pagination details; nextPageNo is null on the last page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let { products, meta } = await client.listProducts(ctx.input.pageNo, ctx.input.perPage);

    let mappedProducts = (Array.isArray(products) ? products : []).map(p => ({
      productId: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    return {
      output: {
        products: mappedProducts,
        meta
      },
      message: `Retrieved **${mappedProducts.length}** product(s).`
    };
  })
  .build();
