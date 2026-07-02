import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  vatId: z.number().optional(),
  productNumber: z.string().optional(),
  discount: z.number().optional(),
  unit: z.string().optional()
});

export let manageSaleCredit = SlateTool.create(spec, {
  name: 'Manage Sale Credit',
  key: 'manage_sale_credit',
  description: `Create, update, or delete a sales credit in Altoviz. Set **action** to "create", "update", or "delete".`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      creditId: z
        .number()
        .optional()
        .describe('Altoviz credit ID (required for update and delete)'),
      customerId: z.number().optional(),
      customerNumber: z.string().optional(),
      date: z.string().optional().describe('Credit date (YYYY-MM-DD)'),
      headerNotes: z.string().optional(),
      footerNotes: z.string().optional(),
      lines: z.array(lineItemSchema).optional(),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      creditId: z.number().optional(),
      number: z.string().nullable().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, creditId, ...data } = ctx.input;

    if (action === 'create') {
      let result = await client.createSaleCredit(data);
      return {
        output: { creditId: result.id, number: result.number },
        message: `Created credit **${result.number || result.id}**.`
      };
    } else if (action === 'update') {
      if (!creditId) throw new Error('creditId is required for update');
      let result = await client.updateSaleCredit(creditId, data);
      return {
        output: { creditId: result.id, number: result.number },
        message: `Updated credit **${result.number || result.id}**.`
      };
    } else {
      if (!creditId) throw new Error('creditId is required for delete');
      await client.deleteSaleCredit(creditId);
      return {
        output: { creditId, deleted: true },
        message: `Deleted credit with ID **${creditId}**.`
      };
    }
  })
  .build();
