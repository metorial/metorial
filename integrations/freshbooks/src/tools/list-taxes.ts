import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshBooksClient } from '../lib/client';
import { spec } from '../spec';

export let listTaxes = SlateTool.create(spec, {
  name: 'List Taxes',
  key: 'list_taxes',
  description: `List all configured tax rates in FreshBooks. Returns tax names, percentages, compound status, and registration numbers.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      taxes: z.array(
        z.object({
          taxId: z.number(),
          name: z.string().nullable().optional(),
          amount: z.string().nullable().optional(),
          compound: z.boolean().nullable().optional(),
          number: z.string().nullable().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshBooksClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      businessId: ctx.config.businessId
    });

    let params: Record<string, string | number> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;

    let result = await client.listTaxes(params);

    let taxes = (result.taxes || []).map((t: any) => ({
      taxId: t.taxid || t.id,
      name: t.name,
      amount: t.amount,
      compound: t.compound,
      number: t.number
    }));

    return {
      output: {
        taxes,
        totalCount: result.total || taxes.length,
        currentPage: result.page || 1,
        totalPages: result.pages || 1
      },
      message: `Found **${result.total || taxes.length}** taxes.`
    };
  })
  .build();
