import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getReceiptGuidance = SlateTool.create(spec, {
  name: 'Get Receipt Guidance',
  key: 'get_receipt_guidance',
  description: `Query which booking accounts, tax rules, and tax rates are valid and compatible with each other based on the current sevDesk account settings. Essential for creating compliant invoices, vouchers, and credit notes in sevDesk 2.0.`,
  instructions: [
    'Use this tool before creating invoices or vouchers to determine valid tax rule/rate/account combinations.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      forExpense: z
        .boolean()
        .optional()
        .describe('Get guidance for expenses/incoming vouchers'),
      forRevenue: z.boolean().optional().describe('Get guidance for revenue/outgoing invoices')
    })
  )
  .output(
    z.object({
      guidance: z
        .any()
        .describe(
          'Receipt guidance data with valid combinations of tax rules, tax rates, and booking accounts'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let result = await client.getReceiptGuidance({
      forExpense: ctx.input.forExpense,
      forRevenue: ctx.input.forRevenue
    });

    return {
      output: {
        guidance: result
      },
      message: `Retrieved receipt guidance for ${ctx.input.forExpense ? 'expenses' : ''}${ctx.input.forExpense && ctx.input.forRevenue ? ' and ' : ''}${ctx.input.forRevenue ? 'revenue' : 'the account'}.`
    };
  })
  .build();
