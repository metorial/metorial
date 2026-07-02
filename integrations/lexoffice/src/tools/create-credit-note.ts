import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      .describe('ISO 3166-1 alpha-2 country code (e.g. DE, AT, CH)')
  })
  .describe(
    'Address of the credit note recipient. Provide either contactId or inline address fields.'
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
  .describe('Credit note line item');

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
      .describe('Tax type for the credit note')
  })
  .describe('Tax conditions for the credit note');

let paymentConditionsSchema = z
  .object({
    paymentTermLabel: z.string().optional().describe('Custom payment term label text'),
    paymentTermLabelTemplate: z
      .string()
      .optional()
      .describe('Template for payment term label with placeholders'),
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

export let createCreditNote = SlateTool.create(spec, {
  name: 'Create Credit Note',
  key: 'create_credit_note',
  description: `Creates a new credit note (Gutschrift) in Lexoffice. Credit notes are used to partially or fully reverse an invoice. Supports specifying a recipient by contact ID or inline address, adding line items with pricing, tax conditions, payment terms, and shipping conditions. The credit note can optionally be finalized immediately or linked to a preceding sales voucher such as an invoice.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      address: addressSchema,
      lineItems: z.array(lineItemSchema).min(1).describe('Line items for the credit note'),
      totalPrice: totalPriceSchema.optional().describe('Total price currency setting'),
      taxConditions: taxConditionsSchema.describe('Tax conditions for the credit note'),
      paymentConditions: paymentConditionsSchema
        .optional()
        .describe('Payment conditions for the credit note'),
      shippingConditions: shippingConditionsSchema
        .optional()
        .describe('Shipping or service date conditions'),
      title: z.string().optional().describe('Custom title for the credit note'),
      introduction: z
        .string()
        .optional()
        .describe('Introduction text displayed before line items'),
      remark: z.string().optional().describe('Closing remark displayed after line items'),
      voucherDate: z
        .string()
        .optional()
        .describe('Credit note date in ISO 8601 format (e.g. 2024-01-15). Defaults to today.'),
      finalize: z
        .boolean()
        .optional()
        .describe(
          'If true, the credit note is finalized immediately and cannot be edited further'
        ),
      precedingSalesVoucherId: z
        .string()
        .optional()
        .describe(
          'ID of a preceding sales voucher (e.g. an invoice) to link to this credit note'
        )
    })
  )
  .output(
    z.object({
      id: z.string().describe('Unique ID of the created credit note'),
      resourceUri: z.string().describe('URI to access the credit note resource'),
      createdDate: z.string().describe('Timestamp when the credit note was created'),
      updatedDate: z.string().describe('Timestamp when the credit note was last updated'),
      version: z.number().describe('Version number of the credit note for optimistic locking')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let creditNoteData: Record<string, any> = {
      address: ctx.input.address,
      lineItems: ctx.input.lineItems,
      taxConditions: ctx.input.taxConditions
    };

    if (ctx.input.totalPrice) creditNoteData.totalPrice = ctx.input.totalPrice;
    if (ctx.input.paymentConditions)
      creditNoteData.paymentConditions = ctx.input.paymentConditions;
    if (ctx.input.shippingConditions)
      creditNoteData.shippingConditions = ctx.input.shippingConditions;
    if (ctx.input.title) creditNoteData.title = ctx.input.title;
    if (ctx.input.introduction) creditNoteData.introduction = ctx.input.introduction;
    if (ctx.input.remark) creditNoteData.remark = ctx.input.remark;
    if (ctx.input.voucherDate) creditNoteData.voucherDate = ctx.input.voucherDate;

    let result = await client.createCreditNote(creditNoteData, {
      finalize: ctx.input.finalize,
      precedingSalesVoucherId: ctx.input.precedingSalesVoucherId
    });

    return {
      output: {
        id: result.id,
        resourceUri: result.resourceUri,
        createdDate: result.createdDate,
        updatedDate: result.updatedDate,
        version: result.version
      },
      message: `Created credit note **${result.id}**${ctx.input.finalize ? ' (finalized)' : ' (draft)'}${ctx.input.precedingSalesVoucherId ? ` linked to voucher ${ctx.input.precedingSalesVoucherId}` : ''}`
    };
  })
  .build();
