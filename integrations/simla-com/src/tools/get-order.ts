import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderItemSchema = z.object({
  itemId: z.number().optional(),
  offerDisplayName: z.string().optional(),
  offerArticle: z.string().optional(),
  offerExternalId: z.string().optional(),
  initialPrice: z.number().optional(),
  discountManualAmount: z.number().optional(),
  discountManualPercent: z.number().optional(),
  quantity: z.number().optional(),
  vatRate: z.string().optional(),
  status: z.string().optional(),
  comment: z.string().optional()
});

let paymentSchema = z.object({
  paymentId: z.number().optional(),
  externalId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  amount: z.number().optional(),
  paidAt: z.string().optional(),
  comment: z.string().optional()
});

export let getOrder = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve a single order's full details by internal ID or external ID. Returns all order information including line items, delivery details, payments, customer info, custom fields, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The order ID to look up'),
      lookupBy: z
        .enum(['id', 'externalId'])
        .default('id')
        .describe('Whether to look up by internal ID or external ID')
    })
  )
  .output(
    z.object({
      orderId: z.number().optional(),
      externalId: z.string().optional(),
      number: z.string().optional(),
      status: z.string().optional(),
      orderType: z.string().optional(),
      orderMethod: z.string().optional(),
      createdAt: z.string().optional(),
      statusUpdatedAt: z.string().optional(),
      totalSumm: z.number().optional(),
      prepaySum: z.number().optional(),
      purchaseSumm: z.number().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      customer: z
        .object({
          customerId: z.number().optional(),
          externalId: z.string().optional(),
          type: z.string().optional()
        })
        .optional(),
      items: z.array(orderItemSchema).optional(),
      delivery: z
        .object({
          code: z.string().optional(),
          cost: z.number().optional(),
          netCost: z.number().optional(),
          date: z.string().optional(),
          address: z
            .object({
              city: z.string().optional(),
              street: z.string().optional(),
              building: z.string().optional(),
              text: z.string().optional()
            })
            .optional()
        })
        .optional(),
      payments: z.array(paymentSchema).optional(),
      managerId: z.number().optional(),
      discountManualAmount: z.number().optional(),
      discountManualPercent: z.number().optional(),
      weight: z.number().optional(),
      shipmentDate: z.string().optional(),
      shipped: z.boolean().optional(),
      customerComment: z.string().optional(),
      managerComment: z.string().optional(),
      tags: z
        .array(z.object({ name: z.string().optional(), color: z.string().optional() }))
        .optional(),
      customFields: z.record(z.string(), z.any()).optional(),
      site: z.string().optional(),
      source: z
        .object({
          source: z.string().optional(),
          medium: z.string().optional(),
          campaign: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let o = await client.getOrder(ctx.input.orderId, ctx.input.lookupBy);

    let payments = o.payments
      ? Object.values(o.payments).map((p: any) => ({
          paymentId: p.id,
          externalId: p.externalId,
          type: p.type,
          status: p.status,
          amount: p.amount,
          paidAt: p.paidAt,
          comment: p.comment
        }))
      : undefined;

    let items = o.items?.map(item => ({
      itemId: item.id,
      offerDisplayName: item.offer?.displayName || item.offer?.name,
      offerArticle: item.offer?.article,
      offerExternalId: item.offer?.externalId,
      initialPrice: item.initialPrice,
      discountManualAmount: item.discountManualAmount,
      discountManualPercent: item.discountManualPercent,
      quantity: item.quantity,
      vatRate: item.vatRate,
      status: item.status,
      comment: item.comment
    }));

    return {
      output: {
        orderId: o.id,
        externalId: o.externalId,
        number: o.number,
        status: o.status,
        orderType: o.orderType,
        orderMethod: o.orderMethod,
        createdAt: o.createdAt,
        statusUpdatedAt: o.statusUpdatedAt,
        totalSumm: o.totalSumm,
        prepaySum: o.prepaySum,
        purchaseSumm: o.purchaseSumm,
        firstName: o.firstName,
        lastName: o.lastName,
        phone: o.phone,
        email: o.email,
        customer: o.customer
          ? {
              customerId: o.customer.id,
              externalId: o.customer.externalId,
              type: o.customer.type
            }
          : undefined,
        items,
        delivery: o.delivery
          ? {
              code: o.delivery.code,
              cost: o.delivery.cost,
              netCost: o.delivery.netCost,
              date: o.delivery.date,
              address: o.delivery.address
                ? {
                    city: o.delivery.address.city,
                    street: o.delivery.address.street,
                    building: o.delivery.address.building,
                    text: o.delivery.address.text
                  }
                : undefined
            }
          : undefined,
        payments,
        managerId: o.managerId,
        discountManualAmount: o.discountManualAmount,
        discountManualPercent: o.discountManualPercent,
        weight: o.weight,
        shipmentDate: o.shipmentDate,
        shipped: o.shipped,
        customerComment: o.customerComment,
        managerComment: o.managerComment,
        tags: o.tags,
        customFields: o.customFields,
        site: o.site,
        source: o.source
          ? {
              source: o.source.source,
              medium: o.source.medium,
              campaign: o.source.campaign
            }
          : undefined
      },
      message: `Retrieved order **#${o.number || o.id}** (status: ${o.status}, total: ${o.totalSumm}).`
    };
  })
  .build();
