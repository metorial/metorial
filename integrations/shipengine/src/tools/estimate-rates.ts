import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let estimateRates = SlateTool.create(spec, {
  name: 'Estimate Shipping Rates',
  key: 'estimate_rates',
  description: `Get quick rate estimates with minimal address info (country, postal code). Useful when full shipment details are not yet known. Provide origin and destination location along with package weight to receive estimated rates from connected carriers.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fromCountryCode: z
        .string()
        .optional()
        .describe('Origin country code (defaults to account country)'),
      fromPostalCode: z.string().optional().describe('Origin postal code'),
      fromCityLocality: z.string().optional().describe('Origin city'),
      fromStateProvince: z.string().optional().describe('Origin state/province'),
      toCountryCode: z.string().describe('Destination country code'),
      toPostalCode: z.string().optional().describe('Destination postal code'),
      toCityLocality: z.string().optional().describe('Destination city'),
      toStateProvince: z.string().optional().describe('Destination state/province'),
      weight: z.object({
        value: z.number().describe('Weight value'),
        unit: z.enum(['pound', 'ounce', 'gram', 'kilogram']).describe('Weight unit')
      }),
      dimensions: z
        .object({
          length: z.number().describe('Length'),
          width: z.number().describe('Width'),
          height: z.number().describe('Height'),
          unit: z.enum(['inch', 'centimeter']).describe('Unit')
        })
        .optional()
        .describe('Package dimensions'),
      carrierIds: z.array(z.string()).optional().describe('Filter to specific carrier IDs'),
      confirmation: z
        .enum(['none', 'delivery', 'signature', 'adult_signature', 'direct_signature'])
        .optional()
        .describe('Delivery confirmation type'),
      shipDate: z.string().optional().describe('Ship date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      estimates: z.array(
        z.object({
          rateType: z.string().describe('Rate type'),
          carrierCode: z.string().describe('Carrier code'),
          carrierName: z.string().describe('Carrier friendly name'),
          serviceCode: z.string().describe('Service code'),
          serviceType: z.string().describe('Service type'),
          shippingAmount: z.number().describe('Shipping cost'),
          insuranceAmount: z.number().describe('Insurance cost'),
          confirmationAmount: z.number().describe('Confirmation cost'),
          otherAmount: z.number().describe('Other charges'),
          currency: z.string().describe('Currency code'),
          deliveryDays: z.number().optional().describe('Estimated delivery days'),
          estimatedDeliveryDate: z.string().optional().describe('Estimated delivery date'),
          guaranteedService: z.boolean().describe('Whether delivery is guaranteed'),
          trackable: z.boolean().describe('Whether shipment is trackable'),
          packageType: z.string().describe('Package type')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let results = await client.estimateRates({
      carrier_ids: ctx.input.carrierIds,
      from_country_code: ctx.input.fromCountryCode,
      from_postal_code: ctx.input.fromPostalCode,
      from_city_locality: ctx.input.fromCityLocality,
      from_state_province: ctx.input.fromStateProvince,
      to_country_code: ctx.input.toCountryCode,
      to_postal_code: ctx.input.toPostalCode,
      to_city_locality: ctx.input.toCityLocality,
      to_state_province: ctx.input.toStateProvince,
      weight: ctx.input.weight,
      dimensions: ctx.input.dimensions,
      confirmation: ctx.input.confirmation,
      ship_date: ctx.input.shipDate
    });

    let estimates = results.map(r => ({
      rateType: r.rate_type,
      carrierCode: r.carrier_code,
      carrierName: r.carrier_friendly_name,
      serviceCode: r.service_code,
      serviceType: r.service_type,
      shippingAmount: r.shipping_amount.amount,
      insuranceAmount: r.insurance_amount.amount,
      confirmationAmount: r.confirmation_amount.amount,
      otherAmount: r.other_amount.amount,
      currency: r.shipping_amount.currency,
      deliveryDays: r.delivery_days,
      estimatedDeliveryDate: r.estimated_delivery_date,
      guaranteedService: r.guaranteed_service,
      trackable: r.trackable,
      packageType: r.package_type
    }));

    return {
      output: { estimates },
      message: `Retrieved **${estimates.length}** rate estimate(s) for shipment to ${ctx.input.toCountryCode}.`
    };
  })
  .build();
