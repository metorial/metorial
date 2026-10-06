import { z } from 'zod';

const optionalString = z.preprocess(
  value => (value === null ? undefined : value),
  z.string().optional()
);
const numeric = (value: unknown) =>
  typeof value === 'string' && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)
    ? Number(value)
    : value;
const number = z.preprocess(numeric, z.number().finite());
const optionalNumber = z.preprocess(
  value => (value === null ? undefined : numeric(value)),
  z.number().finite().optional()
);
const optionalInteger = z.preprocess(
  value =>
    value === null
      ? undefined
      : typeof value === 'string' && /^[+-]?(?:\d+(?:\.0*)?|\.0+)$/.test(value)
        ? Number(value)
        : value,
  z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).optional()
);
const optionalObject = <T extends z.ZodType>(schema: T) =>
  z.preprocess(value => (value === null ? undefined : value), schema.optional());
const lineItem = z.object({
  id: optionalString,
  quantity: optionalInteger,
  product_identifier: optionalString,
  description: optionalString,
  product_tax_code: optionalString,
  unit_price: optionalNumber,
  discount: optionalNumber,
  sales_tax: optionalNumber
});
const transaction = {
  transaction_id: z.string().min(1),
  user_id: optionalInteger,
  transaction_date: optionalString,
  provider: optionalString,
  from_country: optionalString,
  from_zip: optionalString,
  from_state: optionalString,
  from_city: optionalString,
  from_street: optionalString,
  to_country: optionalString,
  to_zip: optionalString,
  to_state: optionalString,
  to_city: optionalString,
  to_street: optionalString,
  amount: optionalNumber,
  shipping: optionalNumber,
  sales_tax: optionalNumber,
  customer_id: optionalString,
  exemption_type: optionalString,
  line_items: optionalObject(z.array(lineItem))
};
export const orderResponse = z.object(transaction);
export const refundResponse = z.object({
  ...transaction,
  transaction_reference_id: optionalString
});
export const customerResponse = z.object({
  customer_id: z.string().min(1),
  exemption_type: z.string(),
  name: z.string(),
  exempt_regions: optionalObject(
    z.array(z.object({ country: z.string(), state: z.string() }))
  ),
  country: optionalString,
  state: optionalString,
  zip: optionalString,
  city: optionalString,
  street: optionalString
});
export const customerReceipt = z.object({ customer_id: z.string().min(1) });
export const idsResponse = z.array(z.string().min(1));
export const categoriesResponse = z.array(
  z.object({ product_tax_code: z.string(), name: z.string(), description: z.string() })
);
export const nexusResponse = z.array(
  z.object({
    country_code: z.string(),
    country: z.string(),
    region_code: z.string(),
    region: z.string()
  })
);
const summaryRate = z.object({ label: z.string(), rate: number });
export const summaryResponse = z.array(
  z.object({
    country_code: z.string(),
    country: z.string(),
    region_code: z.string(),
    region: z.string(),
    minimum_rate: summaryRate,
    average_rate: summaryRate
  })
);
export const addressResponse = z.array(
  z.object({
    zip: z.string(),
    state: z.string(),
    city: z.string(),
    street: optionalString,
    country: z.string()
  })
);
const rateString = z
  .string()
  .refine(value => /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value) && Number.isFinite(Number(value)));
export const rateResponse = z.object({
  zip: z.string(),
  state: z.string(),
  state_rate: rateString,
  county: z.string(),
  county_rate: rateString,
  city: z.string(),
  city_rate: rateString,
  combined_district_rate: rateString,
  combined_rate: rateString,
  freight_taxable: z.boolean()
});
const breakdownLineItem = z.object({
  id: optionalString,
  taxable_amount: optionalNumber,
  tax_collectable: optionalNumber,
  combined_tax_rate: optionalNumber,
  state_taxable_amount: optionalNumber,
  state_sales_tax_rate: optionalNumber,
  state_amount: optionalNumber,
  county_taxable_amount: optionalNumber,
  county_tax_rate: optionalNumber,
  county_amount: optionalNumber,
  city_taxable_amount: optionalNumber,
  city_tax_rate: optionalNumber,
  city_amount: optionalNumber,
  special_district_taxable_amount: optionalNumber,
  special_tax_rate: optionalNumber,
  special_district_amount: optionalNumber
});
export const taxResponse = z.object({
  order_total_amount: optionalNumber,
  shipping: optionalNumber,
  taxable_amount: number,
  amount_to_collect: number,
  rate: number,
  has_nexus: z.boolean(),
  freight_taxable: z.boolean(),
  tax_source: optionalString,
  exemption_type: optionalString,
  jurisdictions: optionalObject(
    z.object({
      country: optionalString,
      state: optionalString,
      county: optionalString,
      city: optionalString
    })
  ),
  breakdown: optionalObject(
    z.object({
      taxable_amount: optionalNumber,
      tax_collectable: optionalNumber,
      combined_tax_rate: optionalNumber,
      state_taxable_amount: optionalNumber,
      state_tax_rate: optionalNumber,
      state_tax_collectable: optionalNumber,
      county_taxable_amount: optionalNumber,
      county_tax_rate: optionalNumber,
      county_tax_collectable: optionalNumber,
      city_taxable_amount: optionalNumber,
      city_tax_rate: optionalNumber,
      city_tax_collectable: optionalNumber,
      special_district_taxable_amount: optionalNumber,
      special_tax_rate: optionalNumber,
      special_district_tax_collectable: optionalNumber,
      line_items: optionalObject(z.array(breakdownLineItem))
    })
  )
});
