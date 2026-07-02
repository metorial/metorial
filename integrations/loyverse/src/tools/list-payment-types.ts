import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paymentTypeSchema = z.object({
  paymentTypeId: z.string().describe('Payment type ID'),
  paymentTypeName: z.string().optional().describe('Payment type name'),
  type: z.string().optional().describe('Type (e.g., CASH, CARD, CUSTOM)'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

export let listPaymentTypes = SlateTool.create(spec, {
  name: 'List Payment Types',
  key: 'list_payment_types',
  description: `Retrieve all configured payment types (e.g., cash, card, custom). Payment type IDs are needed when creating receipts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional(),
      cursor: z.string().optional()
    })
  )
  .output(
    z.object({
      paymentTypes: z.array(paymentTypeSchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPaymentTypes({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let paymentTypes = (result.payment_types ?? []).map((pt: any) => ({
      paymentTypeId: pt.id,
      paymentTypeName: pt.name,
      type: pt.type,
      createdAt: pt.created_at,
      updatedAt: pt.updated_at
    }));

    return {
      output: { paymentTypes, cursor: result.cursor },
      message: `Retrieved **${paymentTypes.length}** payment type(s).`
    };
  })
  .build();
