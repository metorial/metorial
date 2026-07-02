import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let transactionItemSchema = z.object({
  description: z.string().optional().describe('Item description'),
  quantity: z.number().optional().describe('Quantity'),
  amount: z.string().optional().describe('Total item amount'),
  taxName: z.string().optional().describe('Tax name'),
  taxRate: z.number().optional().describe('Tax rate'),
  taxCountry: z.string().optional().describe('Tax country code'),
  productCode: z.string().optional().describe('Product code')
});

let evidenceSchema = z.object({
  billingCountry: z.string().optional().describe('Country from billing address'),
  ipAddress: z.string().optional().describe('Customer IP address'),
  bankCountry: z.string().optional().describe('Country from bank details')
});

export let createTransaction = SlateTool.create(spec, {
  name: 'Create Transaction',
  key: 'create_transaction',
  description: `Record a sale or refund transaction in Quaderno. Quaderno uses this data for invoices, tax reports, and compliance alerts. Location evidence is used to determine the correct tax treatment.`,
  instructions: [
    'Use type "sale" for new sales and "refund" for refunds',
    'Provide location evidence (billing country, IP, bank country) for accurate tax calculation'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      type: z.enum(['sale', 'refund']).describe('Transaction type'),
      currency: z.string().optional().describe('Currency code (e.g., "USD", "EUR")'),
      contactId: z.string().optional().describe('Existing contact ID'),
      contactFirstName: z
        .string()
        .optional()
        .describe('Customer first name (if creating new contact)'),
      contactLastName: z.string().optional().describe('Customer last name'),
      contactEmail: z.string().optional().describe('Customer email'),
      contactTaxId: z.string().optional().describe('Customer tax ID'),
      contactCountry: z.string().optional().describe('Customer country code'),
      contactPostalCode: z.string().optional().describe('Customer postal code'),
      contactCity: z.string().optional().describe('Customer city'),
      contactStreetLine1: z.string().optional().describe('Customer street address'),
      items: z.array(transactionItemSchema).min(1).describe('Transaction line items'),
      evidence: evidenceSchema.optional().describe('Location evidence for tax calculation'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method (e.g., "credit_card", "paypal", "wire_transfer")'),
      paymentProcessorId: z
        .string()
        .optional()
        .describe('ID from payment processor (e.g., Stripe charge ID)'),
      paymentProcessor: z
        .string()
        .optional()
        .describe('Payment processor name (e.g., "stripe", "paypal")'),
      notes: z.string().optional().describe('Transaction notes'),
      tag: z.string().optional().describe('Tag for categorization'),
      customMetadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs')
    })
  )
  .output(
    z.object({
      transactionId: z.string().optional().describe('Transaction document ID'),
      number: z.string().optional().describe('Document number'),
      type: z.string().optional().describe('Transaction type'),
      currency: z.string().optional().describe('Currency'),
      total: z.string().optional().describe('Total amount'),
      state: z.string().optional().describe('Document state'),
      permalink: z.string().optional().describe('Public permalink')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      type: ctx.input.type,
      items_attributes: ctx.input.items.map(item => {
        let mapped: Record<string, any> = {};
        if (item.description) mapped.description = item.description;
        if (item.quantity !== undefined) mapped.quantity = item.quantity;
        if (item.amount) mapped.amount = item.amount;
        if (item.taxName) mapped.tax_name = item.taxName;
        if (item.taxRate !== undefined) mapped.tax_rate = item.taxRate;
        if (item.taxCountry) mapped.tax_country = item.taxCountry;
        if (item.productCode) mapped.product_code = item.productCode;
        return mapped;
      })
    };

    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.contactId) data.contact_id = ctx.input.contactId;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.tag) data.tag = ctx.input.tag;
    if (ctx.input.customMetadata) data.custom_metadata = ctx.input.customMetadata;

    // Contact details for new contact
    if (ctx.input.contactFirstName) data.contact_first_name = ctx.input.contactFirstName;
    if (ctx.input.contactLastName) data.contact_last_name = ctx.input.contactLastName;
    if (ctx.input.contactEmail) data.contact_email = ctx.input.contactEmail;
    if (ctx.input.contactTaxId) data.contact_tax_id = ctx.input.contactTaxId;
    if (ctx.input.contactCountry) data.contact_country = ctx.input.contactCountry;
    if (ctx.input.contactPostalCode) data.contact_postal_code = ctx.input.contactPostalCode;
    if (ctx.input.contactCity) data.contact_city = ctx.input.contactCity;
    if (ctx.input.contactStreetLine1)
      data.contact_street_line_1 = ctx.input.contactStreetLine1;

    // Payment details
    if (ctx.input.paymentMethod) data.payment_method = ctx.input.paymentMethod;
    if (ctx.input.paymentProcessorId) data.payment_processor_id = ctx.input.paymentProcessorId;
    if (ctx.input.paymentProcessor) data.payment_processor = ctx.input.paymentProcessor;

    // Evidence
    if (ctx.input.evidence) {
      let ev = ctx.input.evidence;
      if (ev.billingCountry) data.billing_country = ev.billingCountry;
      if (ev.ipAddress) data.ip_address = ev.ipAddress;
      if (ev.bankCountry) data.bank_country = ev.bankCountry;
    }

    let result = await client.createTransaction(data);

    return {
      output: {
        transactionId: result.id?.toString(),
        number: result.number?.toString(),
        type: result.type,
        currency: result.currency,
        total: result.total,
        state: result.state,
        permalink: result.permalink
      },
      message: `Created ${ctx.input.type} transaction **#${result.number || result.id}** for ${result.total} ${result.currency || ''}`
    };
  })
  .build();
