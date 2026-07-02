import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve all products (courses, memberships, digital downloads, and other offers) from your MemberVault account. Returns product IDs, names, prices, URLs, and statuses. Use this to discover available products before adding or removing users.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.string().describe('Unique identifier for the product'),
            productName: z.string().describe('Name of the product'),
            productPrice: z.string().describe('Price of the product'),
            productUrl: z.string().describe('URL of the product'),
            productStatus: z.string().describe('Current status of the product')
          })
        )
        .describe('List of all products in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let rawProducts = await client.listProducts();

    let products = rawProducts.map(p => ({
      productId: String(p.courseId ?? ''),
      productName: String(p.courseName ?? ''),
      productPrice: String(p.coursePrice ?? ''),
      productUrl: String(p.courseUrl ?? ''),
      productStatus: String(p.courseStatus ?? '')
    }));

    return {
      output: { products },
      message: `Retrieved **${products.length}** product(s) from MemberVault.`
    };
  })
  .build();
