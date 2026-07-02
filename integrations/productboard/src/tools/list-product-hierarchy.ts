import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProductHierarchyTool = SlateTool.create(spec, {
  name: 'List Product Hierarchy',
  key: 'list_product_hierarchy',
  description: `List products and components in the product hierarchy. Returns both products and their components in a single call, giving a view of the workspace structure. Use the returned IDs when creating or organizing features.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of items per page')
    })
  )
  .output(
    z.object({
      products: z.array(z.record(z.string(), z.any())).describe('List of products'),
      components: z.array(z.record(z.string(), z.any())).describe('List of components')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [productsResult, componentsResult] = await Promise.all([
      client.listProducts({
        pageCursor: ctx.input.pageCursor,
        pageLimit: ctx.input.pageLimit
      }),
      client.listComponents({
        pageCursor: ctx.input.pageCursor,
        pageLimit: ctx.input.pageLimit
      })
    ]);

    return {
      output: {
        products: productsResult.data,
        components: componentsResult.data
      },
      message: `Retrieved ${productsResult.data.length} product(s) and ${componentsResult.data.length} component(s).`
    };
  })
  .build();
