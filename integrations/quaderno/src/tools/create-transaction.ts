import { z } from 'zod';
import { fields, mapDocumentOutput, metadata, tags, taxClass } from '../lib/schemas';
import { tool } from '../lib/tool';
import {
  countryInput,
  currencyInput,
  date,
  dateInput,
  decimal,
  decimalInput,
  idInput,
  invalid,
  numericId,
  safeInteger,
  textInput
} from '../lib/validation';

const item = z.object({
  description: z.string().optional(),
  quantity: z.number().finite().optional(),
  amount: decimalInput
    .optional()
    .describe(
      'Required total charged for this line after discounts and taxes, in major currency units.'
    ),
  taxName: z.string().optional(),
  taxRate: z.number().finite().min(0).max(100).optional(),
  taxCountry: countryInput.optional(),
  productCode: textInput.optional(),
  taxCode: taxClass.optional(),
  taxRegion: z.string().optional(),
  taxablePart: z.number().finite().min(0).max(100).optional(),
  additionalTaxName: z.string().optional(),
  additionalTaxRate: z.number().finite().min(0).max(100).optional(),
  additionalTaxablePart: z.number().finite().min(0).max(100).optional(),
  discountRate: z.number().finite().min(0).max(100).optional()
});
const evidence = z.object({
  billingCountry: countryInput.optional(),
  ipAddress: z.string().optional(),
  bankCountry: countryInput.optional()
});
export const createTransaction = tool({
  name: 'Create Transaction',
  key: 'create_transaction',
  description:
    'Record a sale or refund already made, with location evidence and payment details. Quaderno returns the resulting financial document. This does not charge a customer or issue a cash refund. Records can be retained and may affect tax reports.',
  input: {
    type: z.enum(['sale', 'refund']),
    currency: currencyInput.optional(),
    contactId: idInput.optional(),
    contactFirstName: textInput.optional(),
    contactLastName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    contactTaxId: z.string().optional(),
    contactCountry: countryInput.optional(),
    contactPostalCode: z.string().optional(),
    contactCity: z.string().optional(),
    contactStreetLine1: z.string().optional(),
    items: z.array(item).min(1).max(200),
    evidence: evidence.optional(),
    paymentMethod: z
      .enum([
        'credit_card',
        'cash',
        'wire_transfer',
        'direct_debit',
        'check',
        'iou',
        'paypal',
        'other'
      ])
      .optional(),
    paymentProcessorId: z.string().optional(),
    paymentProcessor: z.string().optional(),
    notes: z.string().optional(),
    tag: z.string().optional(),
    customMetadata: z.record(z.string().max(40), z.string().max(500)).optional(),
    date: dateInput.optional(),
    processor: z.string().optional().describe('Platform recording this transaction.'),
    processorId: z
      .string()
      .optional()
      .describe(
        'Platform transaction ID; reuse to link a sale and related refund. This is not a retry guarantee.'
      ),
    processorFeeCents: safeInteger.nonnegative().optional(),
    exchangeRate: z.number().finite().positive().optional()
  },
  output: {
    transactionId: z.string().optional(),
    number: z.string().optional(),
    type: z.string().optional(),
    currency: z.string().optional(),
    total: z.string().optional(),
    state: z.string().optional(),
    permalink: z.string().optional(),
    documentType: z
      .string()
      .optional()
      .describe('Provider document route, when supplied in its resource URL.'),
    totalCents: safeInteger.optional(),
    subtotalCents: safeInteger.optional()
  },
  run: async (input, client) => {
    const contactFields = [
      'contactFirstName',
      'contactLastName',
      'contactEmail',
      'contactTaxId',
      'contactCountry',
      'contactPostalCode',
      'contactCity',
      'contactStreetLine1'
    ];
    if (input.contactId && contactFields.some(key => Reflect.get(input, key) !== undefined))
      throw invalid('Use contactId or inline contact details, not both.');
    if (
      !input.contactId &&
      contactFields.some(key => Reflect.get(input, key) !== undefined) &&
      !input.contactFirstName
    )
      throw invalid('Inline customer details require contactFirstName.');
    if (input.contactId) await client.get('contacts', input.contactId);
    const customer = input.contactId
      ? { id: numericId(input.contactId) }
      : input.contactFirstName === undefined
        ? undefined
        : fields(input, {
            contactFirstName: 'first_name',
            contactLastName: 'last_name',
            contactEmail: 'email',
            contactTaxId: 'tax_id',
            contactCountry: 'country',
            contactPostalCode: 'postal_code',
            contactCity: 'city',
            contactStreetLine1: 'street_line_1'
          });
    const data = {
      type: input.type,
      currency: input.currency,
      customer,
      date: input.date === undefined ? undefined : date(input.date),
      items: input.items.map(value => {
        if (value.amount === undefined)
          throw invalid(
            'Each transaction item requires amount, the total after discounts and taxes.'
          );
        if (!value.description && !value.productCode)
          throw invalid('Each transaction item requires description or productCode.');
        const taxSupplied = [
          value.taxName,
          value.taxRate,
          value.taxCountry,
          value.taxCode,
          value.taxRegion,
          value.taxablePart,
          value.additionalTaxRate,
          value.additionalTaxName,
          value.additionalTaxablePart
        ].some(v => v !== undefined);
        if (
          taxSupplied &&
          (value.taxRate === undefined || !value.taxCountry || !value.taxCode)
        )
          throw invalid(
            'Explicit transaction tax details require taxRate, taxCountry and taxCode.'
          );
        return {
          description: value.description,
          product_code: value.productCode,
          quantity: value.quantity,
          amount: decimal(value.amount),
          discount_rate: value.discountRate,
          tax: taxSupplied
            ? {
                name: value.taxName,
                rate: value.taxRate,
                country: value.taxCountry,
                tax_code: value.taxCode,
                region: value.taxRegion,
                taxable_part: value.taxablePart,
                additional_name: value.additionalTaxName,
                additional_rate: value.additionalTaxRate,
                additional_taxable_part: value.additionalTaxablePart
              }
            : undefined
        };
      }),
      evidence:
        input.evidence === undefined
          ? undefined
          : fields(input.evidence, {
              billingCountry: 'billing_country',
              ipAddress: 'ip_address',
              bankCountry: 'bank_country'
            }),
      payment: {
        method: input.paymentMethod,
        processor: input.paymentProcessor,
        processor_id: input.paymentProcessorId
      },
      processor: input.processor,
      processor_id: input.processorId,
      processor_fee_cents: input.processorFeeCents,
      exchange_rate: input.exchangeRate,
      notes: input.notes,
      tags: tags(input.tag)?.join(','),
      custom_metadata: metadata(input.customMetadata)
    };
    const record = await client.create('transactions', data);
    const doc = mapDocumentOutput(record);
    let documentType: string | undefined;
    if (typeof record.url === 'string') {
      let resourceURL: URL;
      try {
        resourceURL = new URL(record.url);
      } catch {
        throw invalid('Quaderno returned an invalid transaction resource URL.');
      }
      const match = /^\/api\/(invoices|receipts|credits)\/[a-zA-Z0-9_-]+(?:\.json)?$/.exec(
        resourceURL.pathname
      );
      if (match) documentType = match[1];
    }
    return {
      transactionId: doc.documentId,
      documentType,
      number: doc.number,
      type: input.type,
      currency: doc.currency,
      total: doc.total,
      state: doc.state,
      permalink: doc.permalink,
      totalCents: doc.totalCents,
      subtotalCents: doc.subtotalCents
    };
  }
});
