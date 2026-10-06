import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { salesPayload } from '../lib/payloads';
import { spec } from '../spec';

let addressSchema = z
  .object({
    contactId: z
      .string()
      .optional()
      .describe(
        'Reference to an existing Lexoffice contact ID. If provided, inline address fields are ignored.'
      ),
    name: z
      .string()
      .optional()
      .describe('Name of the recipient (used when contactId is not provided)'),
    supplement: z.string().optional().describe('Address supplement (e.g. c/o, department)'),
    street: z.string().optional().describe('Street and house number'),
    zip: z.string().optional().describe('Postal code'),
    city: z.string().optional().describe('City name'),
    countryCode: z
      .string()
      .optional()
      .describe(
        'Provider country or tax-region code (e.g. DE, ES_CN); discover choices with list_reference_data'
      )
  })
  .describe(
    'Address of the order confirmation recipient. Provide either contactId or inline address fields.'
  );

let unitPriceSchema = z
  .object({
    currency: z.literal('EUR').describe('Currency code, must be EUR'),
    netAmount: z
      .number()
      .optional()
      .describe('Net unit price (excl. tax). Provide either netAmount or grossAmount.'),
    grossAmount: z
      .number()
      .optional()
      .describe('Gross unit price (incl. tax). Provide either netAmount or grossAmount.'),
    taxRatePercentage: z.number().describe('Tax rate percentage: 0, 7, or 19')
  })
  .describe('Unit price details');

let lineItemSchema = z
  .object({
    type: z
      .enum(['custom', 'text'])
      .describe('Line item type: "custom" for priced items, "text" for label-only items'),
    name: z.string().describe('Name or title of the line item'),
    description: z.string().optional().describe('Additional description for the line item'),
    quantity: z
      .number()
      .optional()
      .describe('Quantity of the item (required for custom type)'),
    unitName: z
      .string()
      .optional()
      .describe('Unit label (e.g. "Stück", "Stunde", "Pauschal")'),
    unitPrice: unitPriceSchema
      .optional()
      .describe('Unit price details (required for custom type)'),
    discountPercentage: z
      .number()
      .optional()
      .describe('Discount percentage applied to this line item')
  })
  .describe('Order confirmation line item');

let totalPriceSchema = z
  .object({
    currency: z.literal('EUR').describe('Currency code, must be EUR')
  })
  .describe('Total price currency');

let taxConditionsSchema = z
  .object({
    taxType: z
      .enum([
        'net',
        'gross',
        'vatfree',
        'intraCommunitySupply',
        'constructionService13b',
        'externalService13b',
        'thirdPartyCountryService',
        'thirdPartyCountryDelivery',
        'photovoltaicEquipment'
      ])
      .describe('Tax type for the order confirmation')
  })
  .describe('Tax conditions for the order confirmation');

let paymentConditionsSchema = z
  .object({
    paymentTermLabel: z.string().optional().describe('Custom payment term label text'),
    paymentTermLabelTemplate: z
      .string()
      .optional()
      .describe('Legacy read-only field; use paymentTermLabel for writes'),
    paymentTermDuration: z.number().optional().describe('Payment term duration in days')
  })
  .describe('Payment conditions');

let shippingConditionsSchema = z
  .object({
    shippingDate: z
      .string()
      .optional()
      .describe('Shipping or service date (ISO 8601 format, e.g. 2024-01-15)'),
    shippingEndDate: z
      .string()
      .optional()
      .describe('End date for service/delivery periods (ISO 8601 format)'),
    shippingType: z
      .enum(['service', 'serviceperiod', 'delivery', 'deliveryperiod', 'none'])
      .describe('Type of shipping or service')
  })
  .describe('Shipping or service date conditions');

export let createOrderConfirmation = SlateTool.create(spec, {
  name: 'Create Order Confirmation',
  key: 'create_order_confirmation',
  description: `Creates a new order confirmation (Auftragsbestätigung) in Lexoffice. Order confirmations are used to confirm an order to a customer, typically after receiving a quotation acceptance. Supports specifying a recipient by contact ID or inline address, adding line items with pricing, tax conditions, payment terms, and shipping conditions. The order confirmation can optionally be finalized immediately or linked to a preceding sales voucher such as a quotation.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      address: addressSchema,
      lineItems: z
        .array(lineItemSchema)
        .min(1)
        .describe('Line items for the order confirmation'),
      totalPrice: totalPriceSchema.optional().describe('Total price currency setting'),
      taxConditions: taxConditionsSchema.describe('Tax conditions for the order confirmation'),
      paymentConditions: paymentConditionsSchema
        .optional()
        .describe('Payment conditions for the order confirmation'),
      shippingConditions: shippingConditionsSchema
        .optional()
        .describe('Shipping or service date conditions'),
      title: z.string().optional().describe('Custom title for the order confirmation'),
      introduction: z
        .string()
        .optional()
        .describe('Introduction text displayed before line items'),
      remark: z.string().optional().describe('Closing remark displayed after line items'),
      voucherDate: z
        .string()
        .optional()
        .describe(
          'Order confirmation date in ISO 8601 format (e.g. 2024-01-15). Defaults to today.'
        ),
      finalize: z
        .boolean()
        .optional()
        .describe(
          'If true, the order confirmation is finalized immediately and cannot be edited further'
        ),
      precedingSalesVoucherId: z
        .string()
        .optional()
        .describe(
          'ID of a preceding sales voucher (e.g. a quotation) to link to this order confirmation'
        )
    })
  )
  .output(
    z.object({
      id: z.string().describe('Unique ID of the created order confirmation'),
      resourceUri: z.string().describe('URI to access the order confirmation resource'),
      createdDate: z.string().describe('Timestamp when the order confirmation was created'),
      updatedDate: z
        .string()
        .describe('Timestamp when the order confirmation was last updated'),
      version: z
        .number()
        .describe('Version number of the order confirmation for optimistic locking')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const data = salesPayload(ctx.input, 'order_confirmation');
    const result = await client.createOrderConfirmation(data, {
      finalize: ctx.input.finalize,
      precedingSalesVoucherId: ctx.input.precedingSalesVoucherId
    });
    return {
      output: result,
      message: `Created order confirmation **${result.id}**${ctx.input.finalize ? '; immediate finalization was requested' : '; created as a draft'}.`
    };
  })
  .build();
