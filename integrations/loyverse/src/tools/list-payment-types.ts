import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { spec } from '../spec';

let paymentTypeSchema = z.object({
  paymentTypeId: z.string().describe('Payment type ID'),
  paymentTypeName: z.string().optional().describe('Payment type name'),
  type: z
    .string()
    .optional()
    .describe('Type (e.g., CASH, NONINTEGRATEDCARD, CHECK, OTHER, or a payment provider)'),
  storeIds: z
    .array(z.string())
    .optional()
    .describe('Stores where the payment type is available'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

export let listPaymentTypes = SlateTool.create(spec, {
  name: 'List Payment Types',
  key: 'list_payment_types',
  description: `Retrieve all configured payment types (e.g., cash, card, custom). Payment type IDs are needed when creating receipts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      paymentTypeIds: z
        .array(z.string())
        .optional()
        .describe('Only return payment types with these IDs'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Only return payment types created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe(
          'Only return payment types created at or before this ISO 8601 UTC timestamp'
        ),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Only return payment types updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe(
          'Only return payment types updated at or before this ISO 8601 UTC timestamp'
        ),
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of payment types to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      showDeleted: z.boolean().optional().describe('Include deleted payment types')
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
      paymentTypeIds: joinIds(ctx.input.paymentTypeIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let paymentTypes = (result.payment_types ?? []).map((pt: any) => ({
      paymentTypeId: pt.id,
      paymentTypeName: pt.name,
      type: pt.type,
      storeIds: pt.stores ?? undefined,
      createdAt: pt.created_at,
      updatedAt: pt.updated_at,
      deletedAt: pt.deleted_at
    }));

    return {
      output: { paymentTypes, cursor: result.cursor },
      message: `Retrieved **${paymentTypes.length}** payment type(s).`
    };
  })
  .build();
