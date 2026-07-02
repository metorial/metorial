import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve full details of a specific order by its ID. Returns line items, taxes, discounts, fulfillments, tenders, and all order metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orderId: z.string().describe('The ID of the order to retrieve')
    })
  )
  .output(
    z.object({
      orderId: z.string().optional(),
      locationId: z.string().optional(),
      customerId: z.string().optional(),
      referenceId: z.string().optional(),
      state: z.string().optional(),
      lineItems: z.array(z.record(z.string(), z.any())).optional(),
      taxes: z.array(z.record(z.string(), z.any())).optional(),
      discounts: z.array(z.record(z.string(), z.any())).optional(),
      fulfillments: z.array(z.record(z.string(), z.any())).optional(),
      tenders: z.array(z.record(z.string(), z.any())).optional(),
      totalMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
      totalTaxMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
      totalDiscountMoney: z
        .object({ amount: z.number().optional(), currency: z.string().optional() })
        .optional(),
      netAmounts: z.record(z.string(), z.any()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      closedAt: z.string().optional(),
      version: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let o = await client.getOrder(ctx.input.orderId);

    return {
      output: {
        orderId: o.id,
        locationId: o.location_id,
        customerId: o.customer_id,
        referenceId: o.reference_id,
        state: o.state,
        lineItems: o.line_items,
        taxes: o.taxes,
        discounts: o.discounts,
        fulfillments: o.fulfillments,
        tenders: o.tenders,
        totalMoney: o.total_money,
        totalTaxMoney: o.total_tax_money,
        totalDiscountMoney: o.total_discount_money,
        netAmounts: o.net_amounts,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        closedAt: o.closed_at,
        version: o.version
      },
      message: `Order **${o.id}** — State: **${o.state}**, Location: ${o.location_id}`
    };
  })
  .build();
