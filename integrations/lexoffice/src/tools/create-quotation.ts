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
    'Address of the quotation recipient. Provide either contactId or inline address fields.'
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
  .describe('Quotation line item');

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
      .describe('Tax type for the quotation')
  })
  .describe('Tax conditions for the quotation');

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

export let createQuotation = SlateTool.create(spec, {
  name: 'Create Quotation',
  key: 'create_quotation',
  description: `Creates a new quotation (Angebot) in Lexoffice. Supports specifying a recipient by contact ID or inline address, adding line items with pricing, tax conditions, payment terms, and shipping conditions. The quotation can optionally be finalized immediately.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      address: addressSchema,
      lineItems: z.array(lineItemSchema).min(1).describe('Line items for the quotation'),
      totalPrice: totalPriceSchema.optional().describe('Total price currency setting'),
      taxConditions: taxConditionsSchema.describe('Tax conditions for the quotation'),
      paymentConditions: paymentConditionsSchema
        .optional()
        .describe('Payment conditions for the quotation'),
      shippingConditions: shippingConditionsSchema
        .optional()
        .describe('Legacy field unsupported for quotations; omit it'),
      title: z.string().optional().describe('Custom title for the quotation'),
      introduction: z
        .string()
        .optional()
        .describe('Introduction text displayed before line items'),
      remark: z.string().optional().describe('Closing remark displayed after line items'),
      voucherDate: z
        .string()
        .optional()
        .describe('Quotation date in ISO 8601 format (e.g. 2024-01-15). Defaults to today.'),
      expirationDate: z
        .string()
        .optional()
        .describe('Expiration date for the quotation in ISO 8601 format'),
      finalize: z
        .boolean()
        .optional()
        .describe(
          'If true, the quotation is finalized immediately and cannot be edited further'
        )
    })
  )
  .output(
    z.object({
      id: z.string().describe('Unique ID of the created quotation'),
      resourceUri: z.string().describe('URI to access the quotation resource'),
      createdDate: z.string().describe('Timestamp when the quotation was created'),
      updatedDate: z.string().describe('Timestamp when the quotation was last updated'),
      version: z.number().describe('Version number of the quotation for optimistic locking')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const data = salesPayload(ctx.input, 'quotation');
    const result = await client.createQuotation(data, { finalize: ctx.input.finalize });
    return {
      output: result,
      message: `Created quotation **${result.id}**${ctx.input.finalize ? '; immediate finalization was requested' : '; created as a draft'}.`
    };
  })
  .build();
