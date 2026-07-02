import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an existing order's fields in BaseLinker. Can modify contact info, delivery and invoice addresses, payment method, comments, custom fields, and fulfillment states. Can also change the order status. Only provide the fields you want to update — omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('Order ID to update'),
      statusId: z
        .number()
        .optional()
        .describe('New order status ID (changes the order status)'),
      adminComments: z.string().optional().describe('Seller/admin comments'),
      userComments: z.string().optional().describe('Buyer comments'),
      paymentMethod: z.string().optional().describe('Payment method name'),
      paymentMethodCod: z.boolean().optional().describe('Whether payment is cash on delivery'),
      email: z.string().optional().describe('Buyer email address'),
      phone: z.string().optional().describe('Buyer phone number'),
      deliveryMethod: z.string().optional().describe('Delivery method name'),
      deliveryPrice: z.number().optional().describe('Gross delivery price'),
      deliveryFullname: z.string().optional().describe('Recipient full name'),
      deliveryCompany: z.string().optional().describe('Recipient company'),
      deliveryAddress: z.string().optional().describe('Delivery street and number'),
      deliveryPostcode: z.string().optional().describe('Delivery postcode'),
      deliveryCity: z.string().optional().describe('Delivery city'),
      deliveryState: z.string().optional().describe('Delivery state/province'),
      deliveryCountryCode: z
        .string()
        .optional()
        .describe('Delivery country code (two-letter)'),
      invoiceFullname: z.string().optional().describe('Invoice recipient name'),
      invoiceCompany: z.string().optional().describe('Invoice company'),
      invoiceNip: z.string().optional().describe('Invoice tax number / VAT Reg. no.'),
      invoiceAddress: z.string().optional().describe('Invoice street and number'),
      invoicePostcode: z.string().optional().describe('Invoice postcode'),
      invoiceCity: z.string().optional().describe('Invoice city'),
      invoiceCountryCode: z.string().optional().describe('Invoice country code (two-letter)'),
      wantInvoice: z.boolean().optional().describe('Whether the customer wants an invoice'),
      extraField1: z.string().optional().describe('Custom extra field 1'),
      extraField2: z.string().optional().describe('Custom extra field 2'),
      customExtraFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom extra fields as key-value pairs (key = field ID, value = content)'),
      pickState: z
        .number()
        .optional()
        .describe('Product collection status (1=collected, 0=not)'),
      packState: z.number().optional().describe('Product packing status (1=packed, 0=not)'),
      star: z.number().optional().describe('Order star rating (0-5, 0=no star)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });
    let updates: string[] = [];

    // Update status if provided
    if (ctx.input.statusId !== undefined) {
      await client.setOrderStatus(ctx.input.orderId, ctx.input.statusId);
      updates.push(`status changed to ${ctx.input.statusId}`);
    }

    // Collect all non-status field updates
    let { orderId, statusId, ...fields } = ctx.input;
    let hasFieldUpdates = Object.values(fields).some(v => v !== undefined);

    if (hasFieldUpdates) {
      await client.setOrderFields({
        orderId: ctx.input.orderId,
        adminComments: fields.adminComments,
        userComments: fields.userComments,
        paymentMethod: fields.paymentMethod,
        paymentMethodCod: fields.paymentMethodCod,
        email: fields.email,
        phone: fields.phone,
        deliveryMethod: fields.deliveryMethod,
        deliveryPrice: fields.deliveryPrice,
        deliveryFullname: fields.deliveryFullname,
        deliveryCompany: fields.deliveryCompany,
        deliveryAddress: fields.deliveryAddress,
        deliveryPostcode: fields.deliveryPostcode,
        deliveryCity: fields.deliveryCity,
        deliveryState: fields.deliveryState,
        deliveryCountryCode: fields.deliveryCountryCode,
        invoiceFullname: fields.invoiceFullname,
        invoiceCompany: fields.invoiceCompany,
        invoiceNip: fields.invoiceNip,
        invoiceAddress: fields.invoiceAddress,
        invoicePostcode: fields.invoicePostcode,
        invoiceCity: fields.invoiceCity,
        invoiceCountryCode: fields.invoiceCountryCode,
        wantInvoice: fields.wantInvoice,
        extraField1: fields.extraField1,
        extraField2: fields.extraField2,
        customExtraFields: fields.customExtraFields,
        pickState: fields.pickState,
        packState: fields.packState,
        star: fields.star
      });
      updates.push('fields updated');
    }

    return {
      output: { success: true },
      message: `Updated order **#${ctx.input.orderId}**: ${updates.join(', ') || 'no changes applied'}.`
    };
  })
  .build();
