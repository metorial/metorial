import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressOutputSchema = z
  .object({
    contactId: z.string().optional().describe('Referenced Lexoffice contact ID'),
    name: z.string().optional().describe('Recipient name'),
    supplement: z.string().optional().describe('Address supplement'),
    street: z.string().optional().describe('Street and house number'),
    zip: z.string().optional().describe('Postal code'),
    city: z.string().optional().describe('City name'),
    countryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code')
  })
  .optional()
  .describe('Address of the invoice recipient');

let unitPriceOutputSchema = z
  .object({
    currency: z.string().optional().describe('Currency code'),
    netAmount: z.number().optional().describe('Net unit price'),
    grossAmount: z.number().optional().describe('Gross unit price'),
    taxRatePercentage: z.number().optional().describe('Tax rate percentage')
  })
  .optional();

let lineItemOutputSchema = z.object({
  type: z.string().optional().describe('Line item type: custom or text'),
  name: z.string().optional().describe('Name of the line item'),
  description: z.string().optional().describe('Description of the line item'),
  quantity: z.number().optional().describe('Quantity'),
  unitName: z.string().optional().describe('Unit label'),
  unitPrice: unitPriceOutputSchema.describe('Unit price details'),
  discountPercentage: z.number().optional().describe('Discount percentage'),
  lineItemAmount: z.number().optional().describe('Total amount for this line item')
});

let totalPriceOutputSchema = z
  .object({
    currency: z.string().optional().describe('Currency code'),
    totalNetAmount: z.number().optional().describe('Total net amount'),
    totalGrossAmount: z.number().optional().describe('Total gross amount'),
    totalTaxAmount: z.number().optional().describe('Total tax amount')
  })
  .optional()
  .describe('Calculated total price');

let taxConditionsOutputSchema = z
  .object({
    taxType: z.string().optional().describe('Tax type')
  })
  .optional()
  .describe('Tax conditions');

let paymentConditionsOutputSchema = z
  .object({
    paymentTermLabel: z.string().optional().describe('Payment term label text'),
    paymentTermLabelTemplate: z.string().optional().describe('Payment term label template'),
    paymentTermDuration: z.number().optional().describe('Payment term duration in days')
  })
  .optional()
  .describe('Payment conditions');

let shippingConditionsOutputSchema = z
  .object({
    shippingDate: z.string().optional().describe('Shipping or service date'),
    shippingEndDate: z.string().optional().describe('End date for service/delivery period'),
    shippingType: z.string().optional().describe('Shipping type')
  })
  .optional()
  .describe('Shipping conditions');

export let getInvoice = SlateTool.create(spec, {
  name: 'Get Invoice',
  key: 'get_invoice',
  description: `Retrieves a single invoice from Lexoffice by its ID. Returns comprehensive details including address, line items, totals, tax conditions, payment terms, shipping conditions, voucher status, and dates.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      invoiceId: z.string().describe('The unique ID of the invoice to retrieve')
    })
  )
  .output(
    z.object({
      id: z.string().describe('Unique invoice ID'),
      voucherNumber: z.string().optional().describe('Human-readable invoice number'),
      voucherStatus: z
        .string()
        .optional()
        .describe('Invoice status: draft, open, paidoff, or voided'),
      voucherDate: z.string().optional().describe('Invoice date'),
      dueDate: z.string().optional().describe('Payment due date'),
      address: addressOutputSchema,
      lineItems: z.array(lineItemOutputSchema).optional().describe('Invoice line items'),
      totalPrice: totalPriceOutputSchema,
      taxConditions: taxConditionsOutputSchema,
      paymentConditions: paymentConditionsOutputSchema,
      shippingConditions: shippingConditionsOutputSchema,
      title: z.string().optional().describe('Invoice title'),
      introduction: z.string().optional().describe('Introduction text'),
      remark: z.string().optional().describe('Closing remark'),
      archived: z.boolean().optional().describe('Whether the invoice is archived'),
      createdDate: z.string().optional().describe('Timestamp when the invoice was created'),
      updatedDate: z
        .string()
        .optional()
        .describe('Timestamp when the invoice was last updated'),
      version: z.number().optional().describe('Version number for optimistic locking')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let invoice = await client.getInvoice(ctx.input.invoiceId);

    return {
      output: {
        id: invoice.id,
        voucherNumber: invoice.voucherNumber,
        voucherStatus: invoice.voucherStatus,
        voucherDate: invoice.voucherDate,
        dueDate: invoice.dueDate,
        address: invoice.address,
        lineItems: invoice.lineItems,
        totalPrice: invoice.totalPrice,
        taxConditions: invoice.taxConditions,
        paymentConditions: invoice.paymentConditions,
        shippingConditions: invoice.shippingConditions,
        title: invoice.title,
        introduction: invoice.introduction,
        remark: invoice.remark,
        archived: invoice.archived,
        createdDate: invoice.createdDate,
        updatedDate: invoice.updatedDate,
        version: invoice.version
      },
      message: `Retrieved invoice **${invoice.voucherNumber || invoice.id}** — Status: **${invoice.voucherStatus}**${invoice.totalPrice?.totalGrossAmount !== undefined ? `, Total: **${invoice.totalPrice.totalGrossAmount} ${invoice.totalPrice.currency || 'EUR'}**` : ''}`
    };
  })
  .build();
