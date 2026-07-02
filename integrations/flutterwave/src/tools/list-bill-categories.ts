import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBillCategories = SlateTool.create(spec, {
  name: 'List Bill Categories',
  key: 'list_bill_categories',
  description: `Retrieve available bill payment categories and billers. Returns biller codes and item codes needed for making bill payments. Optionally filter by category or country, or get items for a specific biller.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      billerCode: z.string().optional().describe('Get items for a specific biller code'),
      category: z.string().optional().describe('Filter billers by category code'),
      country: z
        .string()
        .optional()
        .describe('Filter billers by country code (e.g. NG, GH, KE)')
    })
  )
  .output(
    z.object({
      categories: z
        .array(z.any())
        .optional()
        .describe('Bill categories with biller codes and item codes'),
      billers: z.array(z.any()).optional().describe('Billers matching the filter criteria'),
      items: z.array(z.any()).optional().describe('Items for the specified biller')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.billerCode) {
      let result = await client.getBillItems(ctx.input.billerCode);
      return {
        output: {
          items: result.data
        },
        message: `Found **${(result.data || []).length}** items for biller ${ctx.input.billerCode}.`
      };
    }

    if (ctx.input.category || ctx.input.country) {
      let result = await client.getBillers(ctx.input.category, ctx.input.country);
      return {
        output: {
          billers: result.data
        },
        message: `Found **${(result.data || []).length}** billers.`
      };
    }

    let result = await client.getBillCategories();
    return {
      output: {
        categories: result.data
      },
      message: `Found **${(result.data || []).length}** bill categories.`
    };
  })
  .build();
