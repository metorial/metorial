import { z } from 'zod';
import { fields } from '../lib/schemas';
import { tool } from '../lib/tool';
import { countryInput, currencyInput, date, dateInput, object } from '../lib/validation';

const nullableText = z.string().nullable().optional(),
  nullableNumber = z.number().finite().nullable().optional();
export const calculateTax = tool({
  name: 'Calculate Tax',
  key: 'calculate_tax',
  description:
    'Ask Quaderno to calculate tax using the supplied location, product and account settings. Return its status, rates and calculated amounts; this does not establish a legal obligation or independently verify the account configuration.',
  readOnly: true,
  input: {
    toCountry: countryInput,
    toPostalCode: z.string().optional(),
    toCity: z.string().optional(),
    toStreet: z.string().optional(),
    fromCountry: countryInput.optional(),
    fromPostalCode: z.string().optional(),
    taxCode: z.string().optional(),
    amount: z
      .number()
      .finite()
      .min(Number.MIN_SAFE_INTEGER)
      .max(Number.MAX_SAFE_INTEGER)
      .optional()
      .describe('Amount in currency major units, for example 9.99.'),
    customerTaxId: z.string().optional(),
    taxBehavior: z.enum(['inclusive', 'exclusive']).optional(),
    productType: z.enum(['good', 'service']).optional(),
    currency: currencyInput.optional(),
    date: dateInput.optional()
  },
  output: {
    name: nullableText,
    rate: z.number().finite().optional(),
    country: z.string().optional(),
    region: nullableText,
    taxCode: z.string().optional(),
    taxBehavior: z.string().optional(),
    extraTax: z.unknown().optional(),
    status: z.enum(['taxable', 'non_taxable', 'not_registered', 'reverse_charge']),
    subtotal: nullableNumber,
    taxAmount: nullableNumber,
    totalAmount: nullableNumber,
    taxablePart: nullableNumber,
    additionalName: nullableText,
    additionalRate: nullableNumber,
    additionalTaxablePart: nullableNumber,
    additionalTaxAmount: nullableNumber,
    notice: nullableText,
    county: nullableText,
    city: nullableText
  },
  run: async (input, client) => {
    const query = fields(input, {
      toCountry: 'to_country',
      toPostalCode: 'to_postal_code',
      toCity: 'to_city',
      toStreet: 'to_street',
      fromCountry: 'from_country',
      fromPostalCode: 'from_postal_code',
      taxCode: 'tax_code',
      amount: 'amount',
      customerTaxId: 'tax_id',
      taxBehavior: 'tax_behavior',
      productType: 'product_type',
      currency: 'currency',
      date: 'date'
    });
    if (input.date !== undefined) query.date = date(input.date);
    const r = object(await client.request('GET', 'tax_rates/calculate', undefined, query));
    return {
      name: r.name,
      rate: r.rate,
      country: r.country,
      region: r.region,
      taxCode: r.tax_code,
      taxBehavior: r.tax_behavior,
      status: r.status,
      subtotal: r.subtotal,
      taxAmount: r.tax_amount,
      totalAmount: r.total_amount,
      taxablePart: r.taxable_part,
      additionalName: r.additional_name,
      additionalRate: r.additional_rate,
      additionalTaxablePart: r.additional_taxable_part,
      additionalTaxAmount: r.additional_tax_amount,
      notice: r.notice,
      county: r.county,
      city: r.city,
      extraTax:
        r.additional_rate === undefined
          ? undefined
          : {
              name: r.additional_name,
              rate: r.additional_rate,
              taxablePart: r.additional_taxable_part,
              taxAmount: r.additional_tax_amount
            }
    };
  }
});
