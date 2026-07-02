import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nexusAddressSchema = z.object({
  nexusId: z.string().optional().describe('Unique identifier for the nexus address'),
  country: z.string().optional().describe('Two-letter ISO country code (e.g. US)'),
  zip: z.string().optional().describe('Postal code for the nexus address'),
  state: z.string().optional().describe('Two-letter state code (e.g. CA)'),
  city: z.string().optional().describe('City name'),
  street: z.string().optional().describe('Street address')
});

let lineItemSchema = z.object({
  lineItemId: z.string().optional().describe('Unique identifier for the line item'),
  quantity: z.number().optional().describe('Quantity of the item'),
  productTaxCode: z
    .string()
    .optional()
    .describe('Product tax code for exemption rules (e.g. 31000 for digital goods)'),
  unitPrice: z.number().optional().describe('Unit price of the item'),
  discount: z.number().optional().describe('Total discount amount for the line item')
});

let breakdownLineItemSchema = z.object({
  lineItemId: z.string().optional().describe('Line item identifier'),
  taxableAmount: z.number().optional(),
  taxCollectable: z.number().optional(),
  combinedTaxRate: z.number().optional(),
  stateTaxableAmount: z.number().optional(),
  stateSalesTaxRate: z.number().optional(),
  stateAmount: z.number().optional(),
  countyTaxableAmount: z.number().optional(),
  countyTaxRate: z.number().optional(),
  countyAmount: z.number().optional(),
  cityTaxableAmount: z.number().optional(),
  cityTaxRate: z.number().optional(),
  cityAmount: z.number().optional(),
  specialDistrictTaxableAmount: z.number().optional(),
  specialTaxRate: z.number().optional(),
  specialDistrictAmount: z.number().optional()
});

export let calculateTax = SlateTool.create(spec, {
  name: 'Calculate Sales Tax',
  key: 'calculate_tax',
  description: `Calculate the exact sales tax for a given order based on origin/destination addresses, order amount, shipping, and line items. Returns total tax to collect with a detailed breakdown by jurisdiction (state, county, city, special district) and per line item. Supports product-level exemptions via tax codes and customer-level exemptions.`,
  instructions: [
    'Provide at minimum a destination address (toCountry, toState) and shipping amount.',
    'Use nexusAddresses to specify nexus locations per-request, or rely on your TaxJar account settings.',
    'Use productTaxCode on line items for product-specific exemptions (e.g. clothing, food, software).',
    'Use customerId or exemptionType for customer-level exemptions.'
  ],
  constraints: [
    'International calculations have limited support and only work for accounts with this feature enabled.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromCountry: z
        .string()
        .optional()
        .describe('Origin two-letter ISO country code (e.g. US)'),
      fromZip: z.string().optional().describe('Origin ZIP/postal code'),
      fromState: z.string().optional().describe('Origin two-letter state code'),
      fromCity: z.string().optional().describe('Origin city'),
      fromStreet: z.string().optional().describe('Origin street address'),
      toCountry: z.string().describe('Destination two-letter ISO country code (e.g. US)'),
      toZip: z.string().optional().describe('Destination ZIP/postal code'),
      toState: z.string().describe('Destination two-letter state code'),
      toCity: z.string().optional().describe('Destination city'),
      toStreet: z.string().optional().describe('Destination street address'),
      amount: z
        .number()
        .optional()
        .describe(
          'Total order amount excluding shipping and tax. If omitted, calculated from line items.'
        ),
      shipping: z.number().describe('Total shipping cost for the order'),
      customerId: z
        .string()
        .optional()
        .describe('Unique customer identifier for exemption lookup'),
      exemptionType: z
        .enum(['wholesale', 'government', 'marketplace', 'other', 'non_exempt'])
        .optional()
        .describe('Customer exemption type'),
      nexusAddresses: z
        .array(nexusAddressSchema)
        .optional()
        .describe('Nexus address locations. Overrides account settings if provided.'),
      lineItems: z
        .array(lineItemSchema)
        .optional()
        .describe('Individual line items in the order')
    })
  )
  .output(
    z.object({
      orderTotalAmount: z.number().describe('Total order amount including shipping'),
      shipping: z.number().describe('Shipping amount'),
      taxableAmount: z.number().describe('Amount of the order subject to tax'),
      amountToCollect: z.number().describe('Total sales tax to collect'),
      rate: z.number().describe('Combined tax rate applied'),
      hasNexus: z.boolean().describe('Whether nexus exists for this order'),
      freightTaxable: z.boolean().describe('Whether shipping is taxable at this location'),
      taxSource: z.string().optional().describe('Tax sourcing method: origin or destination'),
      jurisdictions: z
        .object({
          country: z.string().optional(),
          state: z.string().optional(),
          county: z.string().optional(),
          city: z.string().optional()
        })
        .optional()
        .describe('Jurisdiction names used for the calculation'),
      breakdown: z
        .object({
          taxableAmount: z.number().optional(),
          taxCollectable: z.number().optional(),
          combinedTaxRate: z.number().optional(),
          stateTaxableAmount: z.number().optional(),
          stateTaxRate: z.number().optional(),
          stateTaxCollectable: z.number().optional(),
          countyTaxableAmount: z.number().optional(),
          countyTaxRate: z.number().optional(),
          countyTaxCollectable: z.number().optional(),
          cityTaxableAmount: z.number().optional(),
          cityTaxRate: z.number().optional(),
          cityTaxCollectable: z.number().optional(),
          specialDistrictTaxableAmount: z.number().optional(),
          specialTaxRate: z.number().optional(),
          specialDistrictTaxCollectable: z.number().optional(),
          lineItems: z.array(breakdownLineItemSchema).optional()
        })
        .optional()
        .describe('Detailed tax breakdown by jurisdiction')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.calculateTax({
      from_country: ctx.input.fromCountry,
      from_zip: ctx.input.fromZip,
      from_state: ctx.input.fromState,
      from_city: ctx.input.fromCity,
      from_street: ctx.input.fromStreet,
      to_country: ctx.input.toCountry,
      to_zip: ctx.input.toZip,
      to_state: ctx.input.toState,
      to_city: ctx.input.toCity,
      to_street: ctx.input.toStreet,
      amount: ctx.input.amount,
      shipping: ctx.input.shipping,
      customer_id: ctx.input.customerId,
      exemption_type: ctx.input.exemptionType,
      nexus_addresses: ctx.input.nexusAddresses?.map(a => ({
        id: a.nexusId,
        country: a.country,
        zip: a.zip,
        state: a.state,
        city: a.city,
        street: a.street
      })),
      line_items: ctx.input.lineItems?.map(li => ({
        id: li.lineItemId,
        quantity: li.quantity,
        product_tax_code: li.productTaxCode,
        unit_price: li.unitPrice,
        discount: li.discount
      }))
    });

    let output = {
      orderTotalAmount: result.order_total_amount,
      shipping: result.shipping,
      taxableAmount: result.taxable_amount,
      amountToCollect: result.amount_to_collect,
      rate: result.rate,
      hasNexus: result.has_nexus,
      freightTaxable: result.freight_taxable,
      taxSource: result.tax_source,
      jurisdictions: result.jurisdictions
        ? {
            country: result.jurisdictions.country,
            state: result.jurisdictions.state,
            county: result.jurisdictions.county,
            city: result.jurisdictions.city
          }
        : undefined,
      breakdown: result.breakdown
        ? {
            taxableAmount: result.breakdown.taxable_amount,
            taxCollectable: result.breakdown.tax_collectable,
            combinedTaxRate: result.breakdown.combined_tax_rate,
            stateTaxableAmount: result.breakdown.state_taxable_amount,
            stateTaxRate: result.breakdown.state_tax_rate,
            stateTaxCollectable: result.breakdown.state_tax_collectable,
            countyTaxableAmount: result.breakdown.county_taxable_amount,
            countyTaxRate: result.breakdown.county_tax_rate,
            countyTaxCollectable: result.breakdown.county_tax_collectable,
            cityTaxableAmount: result.breakdown.city_taxable_amount,
            cityTaxRate: result.breakdown.city_tax_rate,
            cityTaxCollectable: result.breakdown.city_tax_collectable,
            specialDistrictTaxableAmount: result.breakdown.special_district_taxable_amount,
            specialTaxRate: result.breakdown.special_tax_rate,
            specialDistrictTaxCollectable: result.breakdown.special_district_tax_collectable,
            lineItems: result.breakdown.line_items?.map(li => ({
              lineItemId: li.id,
              taxableAmount: li.taxable_amount,
              taxCollectable: li.tax_collectable,
              combinedTaxRate: li.combined_tax_rate,
              stateTaxableAmount: li.state_taxable_amount,
              stateSalesTaxRate: li.state_sales_tax_rate,
              stateAmount: li.state_amount,
              countyTaxableAmount: li.county_taxable_amount,
              countyTaxRate: li.county_tax_rate,
              countyAmount: li.county_amount,
              cityTaxableAmount: li.city_taxable_amount,
              cityTaxRate: li.city_tax_rate,
              cityAmount: li.city_amount,
              specialDistrictTaxableAmount: li.special_district_taxable_amount,
              specialTaxRate: li.special_tax_rate,
              specialDistrictAmount: li.special_district_amount
            }))
          }
        : undefined
    };

    return {
      output,
      message: `Tax calculated: **$${result.amount_to_collect.toFixed(2)}** to collect on a $${result.order_total_amount.toFixed(2)} order (rate: ${(result.rate * 100).toFixed(2)}%). Nexus: ${result.has_nexus ? 'Yes' : 'No'}, freight taxable: ${result.freight_taxable ? 'Yes' : 'No'}.`
    };
  })
  .build();
