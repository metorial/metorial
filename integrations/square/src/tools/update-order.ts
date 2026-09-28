import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, generateIdempotencyKey } from '../lib/helpers';
import { spec } from '../spec';
import { mapOrderSummary, orderSummaryOutputSchema } from './order-shared';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description:
    'Update an OPEN or DRAFT order using sparse fields and its current version, or set state to CANCELED to cancel an uninvoiced order. Invoice-linked orders must be canceled through manage_invoice. Array entries match by uid.',
  tags: { destructive: false }
})
  .scopes(allOf('ORDERS_WRITE'))
  .input(
    z.object({
      orderId: z.string().describe('The ID of the order to update'),
      version: z
        .number()
        .int()
        .nonnegative()
        .describe('Current order version from get_order or search_orders'),
      state: z
        .literal('CANCELED')
        .optional()
        .describe(
          'Cancel an uninvoiced OPEN or DRAFT order. For an invoice-linked order, cancel or delete the invoice instead'
        ),
      lineItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Sparse line item entries; include uid to update an existing item'),
      taxes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Sparse tax entries; include uid to update an existing tax'),
      discounts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Sparse discount entries; include uid to update an existing discount'),
      serviceCharges: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Sparse service charge entries; include uid to update an existing charge'),
      fulfillments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Sparse fulfillment entries; include uid to update an existing fulfillment'),
      customerId: z.string().optional().describe('Updated customer ID for the order'),
      referenceId: z.string().optional().describe('Updated custom reference ID'),
      fieldsToClear: z
        .array(z.string())
        .optional()
        .describe('Square dot-notation paths to clear, e.g. discounts'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate updates. Auto-generated if omitted')
    })
  )
  .output(orderSummaryOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let fields = {
      line_items: ctx.input.lineItems,
      taxes: ctx.input.taxes,
      discounts: ctx.input.discounts,
      service_charges: ctx.input.serviceCharges,
      fulfillments: ctx.input.fulfillments,
      customer_id: ctx.input.customerId,
      reference_id: ctx.input.referenceId
    };
    if (
      !Object.values(fields).some(value => value !== undefined) &&
      !ctx.input.fieldsToClear?.length &&
      !ctx.input.state
    ) {
      throw squareServiceError(
        'Provide at least one order field or fieldsToClear path to update.'
      );
    }
    if (
      ctx.input.state === 'CANCELED' &&
      (Object.values(fields).some(value => value !== undefined) ||
        ctx.input.fieldsToClear?.length)
    ) {
      throw squareServiceError(
        'Cancel the order in a separate update without other field changes.'
      );
    }
    let order = await client.updateOrder(ctx.input.orderId, {
      order: {
        version: ctx.input.version,
        state: ctx.input.state,
        ...Object.fromEntries(
          Object.entries(fields).filter(([, value]) => value !== undefined)
        )
      },
      fieldsToClear: ctx.input.fieldsToClear,
      idempotencyKey: ctx.input.idempotencyKey || generateIdempotencyKey()
    });
    let output = mapOrderSummary(order);

    return {
      output,
      message: `Order **${output.orderId}** updated. Version: **${output.version ?? 'N/A'}**`
    };
  })
  .build();
