import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new order in Simla.com. Supports specifying customer, line items with trade offers, delivery details, payments, discounts, and custom fields. Returns the new order's internal ID.`,
  instructions: [
    'Line items reference product trade offers. Provide either offer ID or externalId.',
    'Delivery and payment types must match the codes configured in your Simla.com instance.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      externalId: z.string().optional().describe('External order ID from your system'),
      number: z.string().optional().describe('Order number'),
      orderType: z.string().optional().describe('Order type code'),
      orderMethod: z
        .string()
        .optional()
        .describe('Order method code (e.g., phone, shopping-cart)'),
      status: z.string().optional().describe('Order status code'),
      firstName: z.string().optional().describe('Customer first name on the order'),
      lastName: z.string().optional().describe('Customer last name on the order'),
      phone: z.string().optional().describe('Customer phone'),
      email: z.string().optional().describe('Customer email'),
      customer: z
        .object({
          customerId: z.number().optional().describe('Internal customer ID to link'),
          externalId: z.string().optional().describe('External customer ID to link')
        })
        .optional()
        .describe('Link to an existing customer'),
      items: z
        .array(
          z.object({
            offerId: z.number().optional().describe('Trade offer internal ID'),
            offerExternalId: z.string().optional().describe('Trade offer external ID'),
            offerXmlId: z.string().optional().describe('Trade offer XML ID'),
            initialPrice: z.number().describe('Item price per unit'),
            quantity: z.number().describe('Item quantity'),
            discountManualAmount: z
              .number()
              .optional()
              .describe('Manual discount amount per unit'),
            discountManualPercent: z
              .number()
              .optional()
              .describe('Manual discount percentage'),
            vatRate: z.string().optional().describe('VAT rate (e.g., "none", "20")'),
            comment: z.string().optional().describe('Item comment')
          })
        )
        .optional()
        .describe('Order line items'),
      delivery: z
        .object({
          code: z.string().optional().describe('Delivery type code'),
          cost: z.number().optional().describe('Delivery cost'),
          date: z.string().optional().describe('Delivery date (YYYY-MM-DD)'),
          address: z
            .object({
              countryIso: z.string().optional(),
              region: z.string().optional(),
              city: z.string().optional(),
              street: z.string().optional(),
              building: z.string().optional(),
              flat: z.string().optional(),
              index: z.string().optional(),
              text: z.string().optional()
            })
            .optional()
            .describe('Delivery address')
        })
        .optional()
        .describe('Delivery details'),
      payments: z
        .array(
          z.object({
            type: z.string().describe('Payment type code'),
            amount: z.number().optional().describe('Payment amount'),
            status: z.string().optional().describe('Payment status code'),
            externalId: z.string().optional().describe('External payment ID'),
            comment: z.string().optional()
          })
        )
        .optional()
        .describe('Payment records'),
      discountManualAmount: z
        .number()
        .optional()
        .describe('Order-level manual discount amount'),
      discountManualPercent: z
        .number()
        .optional()
        .describe('Order-level manual discount percentage'),
      managerId: z.number().optional().describe('Assigned manager user ID'),
      customerComment: z.string().optional().describe('Customer comment on the order'),
      managerComment: z.string().optional().describe('Manager internal comment'),
      shipmentDate: z.string().optional().describe('Expected shipment date (YYYY-MM-DD)'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      tags: z
        .array(
          z.object({
            name: z.string().describe('Tag name')
          })
        )
        .optional()
        .describe('Order tags'),
      source: z
        .object({
          source: z.string().optional(),
          medium: z.string().optional(),
          campaign: z.string().optional()
        })
        .optional()
        .describe('Source attribution')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Internal ID of the created order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let orderData: Record<string, any> = { ...ctx.input };

    // Map customer field
    if (ctx.input.customer) {
      orderData.customer = {
        id: ctx.input.customer.customerId,
        externalId: ctx.input.customer.externalId
      };
    }

    // Map items offer fields
    if (ctx.input.items) {
      orderData.items = ctx.input.items.map(item => ({
        offer: {
          id: item.offerId,
          externalId: item.offerExternalId,
          xmlId: item.offerXmlId
        },
        initialPrice: item.initialPrice,
        quantity: item.quantity,
        discountManualAmount: item.discountManualAmount,
        discountManualPercent: item.discountManualPercent,
        vatRate: item.vatRate,
        comment: item.comment
      }));
    }

    // Map payments to object format if needed
    if (ctx.input.payments) {
      orderData.payments = ctx.input.payments;
    }

    let result = await client.createOrder(orderData);

    return {
      output: {
        orderId: result.orderId
      },
      message: `Created order with ID **${result.orderId}**.`
    };
  })
  .build();
