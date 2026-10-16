import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  taxExcludedPrice: z
    .number()
    .optional()
    .describe('Unit price excluding tax; takes precedence over unitPrice'),
  taxIncludedPrice: z.number().optional().describe('Unit price including tax'),
  productId: z.number().optional(),
  productInternalId: z.string().optional(),
  classificationId: z
    .number()
    .optional()
    .describe('Classification ID from get_settings when not using a product'),
  discountType: z
    .enum(['Percent', 'Fixed'])
    .optional()
    .describe('How numeric discount is interpreted; defaults to Percent'),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unitPrice: z.number().optional(),
  vatId: z.number().optional(),
  productNumber: z.string().optional(),
  discount: z.number().optional(),
  unit: z.string().optional().describe('Unit code from get_settings with includeUnits')
});

export let manageSaleCredit = SlateTool.create(spec, {
  name: 'Manage Sale Credit',
  key: 'manage_sale_credit',
  description: `Create, update, or delete a sales credit in Altoviz. Set **action** to "create", "update", or "delete".`,
  tags: {
    destructive: true
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
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including fields not shown in the summary'),
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
        output: { creditId: result.id, number: result.number, raw: result },
        message: `Created credit **${result.number || result.id}**.`
      };
    } else if (action === 'update') {
      if (!creditId) throw createApiServiceError('creditId is required for update');
      let result = await client.updateSaleCredit(creditId, data);
      return {
        output: { creditId: result.id, number: result.number, raw: result },
        message: `Updated credit **${result.number || result.id}**.`
      };
    } else {
      if (!creditId) throw createApiServiceError('creditId is required for delete');
      await client.deleteSaleCredit(creditId);
      return {
        output: { creditId, deleted: true },
        message: `Deleted credit with ID **${creditId}**.`
      };
    }
  })
  .build();
