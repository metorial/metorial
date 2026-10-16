import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVendors = SlateTool.create(spec, {
  name: 'List Vendors',
  key: 'list_vendors',
  description: 'List vendor IDs and names for product creation and filtering.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number, a positive integer'),
      pageSize: z
        .number()
        .optional()
        .describe('Items per page, an integer from 1 to 100; default 20'),
      sort: z
        .string()
        .optional()
        .describe('Attribute to sort by; prefix with - for descending')
    })
  )
  .output(
    z.object({
      vendors: z.array(z.any()),
      totalCount: z.number(),
      currentPage: z.number(),
      lastPage: z.number(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
    let res = await client.listVendors({
      pagination: { pageNumber: ctx.input.pageNumber, pageSize: ctx.input.pageSize },
      sort: ctx.input.sort
    });
    return {
      output: {
        vendors: res.data,
        totalCount: res.meta.page.total,
        currentPage: res.meta.page['current-page'],
        lastPage: res.meta.page['last-page'],
        raw: res
      },
      message: `Retrieved ${res.data.length} vendors (page ${res.meta.page['current-page']} of ${res.meta.page['last-page']}).`
    };
  })
  .build();
