import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addMerchantKeyword = SlateTool.create(spec, {
  name: 'Add Merchant Keyword',
  key: 'add_merchant_keyword',
  description: `Add a merchant name keyword to your account's prediction model. This helps Taggun better recognize and normalize merchant names on receipts.

Changes to the model are applied daily. Use this to improve extraction accuracy for merchants that are frequently encountered in your receipt processing workflows.`,
  instructions: ['Use the exact merchant name as it appears on receipts.'],
  constraints: ['Model updates take effect within 24 hours.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      merchantName: z
        .string()
        .describe('The merchant name keyword to add to the prediction model')
    })
  )
  .output(
    z.object({
      result: z.string().nullable().optional().describe('Result of the keyword addition')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addMerchantKeyword(ctx.input.merchantName);

    return {
      output: {
        result: result?.result ?? 'Merchant keyword added successfully.'
      },
      message: `Added merchant keyword **"${ctx.input.merchantName}"** to the prediction model.`
    };
  })
  .build();
