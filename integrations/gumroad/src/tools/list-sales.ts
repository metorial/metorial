import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadActionScopes } from '../lib/scopes';
import { spec } from '../spec';
import { mapSaleSummary, saleSummaryFields } from './sale-utils';

let saleSchema = z.object({
  ...saleSummaryFields,
  licenseKey: z.string().optional().describe('License key if applicable')
});

export let listSales = SlateTool.create(spec, {
  name: 'List Sales',
  key: 'list_sales',
  description: `Retrieve sales from your Gumroad account with optional filtering by date range, buyer email, buyer name, license key, product, or order ID. Results are paginated with a cursor.`,
  instructions: [
    'Use after/before dates in YYYY-MM-DD format.',
    'Use pageKey from a previous response to get the next page of results.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(gumroadActionScopes.viewSales)
  .input(
    z.object({
      after: z.string().optional().describe('Only return sales after this date (YYYY-MM-DD)'),
      before: z
        .string()
        .optional()
        .describe('Only return sales before this date (YYYY-MM-DD)'),
      email: z.string().optional().describe('Filter by buyer email address'),
      name: z.string().optional().describe('Filter by buyer name'),
      licenseKey: z.string().optional().describe('Filter by license key'),
      productId: z.string().optional().describe('Filter by product ID'),
      orderId: z.string().optional().describe('Filter by order ID'),
      pageKey: z.string().optional().describe('Pagination cursor from previous response')
    })
  )
  .output(
    z.object({
      sales: z.array(saleSchema).describe('List of sales'),
      nextPageKey: z.string().optional().describe('Cursor for next page of results'),
      nextPageUrl: z.string().optional().describe('URL for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let result = await client.listSales({
      after: ctx.input.after,
      before: ctx.input.before,
      email: ctx.input.email,
      name: ctx.input.name,
      licenseKey: ctx.input.licenseKey,
      productId: ctx.input.productId,
      orderId: ctx.input.orderId,
      pageKey: ctx.input.pageKey
    });

    let mapped = result.sales.map((s: any) => ({
      ...mapSaleSummary(s),
      licenseKey: s.license_key || undefined
    }));

    return {
      output: {
        sales: mapped,
        nextPageKey: result.nextPageKey,
        nextPageUrl: result.nextPageUrl
      },
      message: `Found **${mapped.length}** sale(s).${result.nextPageKey ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
