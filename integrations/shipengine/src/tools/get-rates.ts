import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  name: z.string().optional().describe('Name of the person'),
  companyName: z.string().optional().describe('Company name'),
  phone: z.string().optional().describe('Phone number'),
  addressLine1: z.string().describe('Street address line 1'),
  addressLine2: z.string().optional().describe('Street address line 2'),
  cityLocality: z.string().optional().describe('City or locality'),
  stateProvince: z.string().optional().describe('State or province'),
  postalCode: z.string().optional().describe('Postal code'),
  countryCode: z.string().describe('Two-letter ISO country code')
});

let weightSchema = z.object({
  value: z.number().describe('Weight value'),
  unit: z.enum(['pound', 'ounce', 'gram', 'kilogram']).describe('Weight unit')
});

let dimensionsSchema = z.object({
  length: z.number().describe('Length'),
  width: z.number().describe('Width'),
  height: z.number().describe('Height'),
  unit: z.enum(['inch', 'centimeter']).describe('Dimension unit')
});

let packageSchema = z.object({
  weight: weightSchema,
  dimensions: dimensionsSchema.optional().describe('Package dimensions'),
  packageCode: z.string().optional().describe('Carrier-specific package type code'),
  contentDescription: z.string().optional().describe('Description of package contents')
});

let rateOutputSchema = z.object({
  rateId: z.string().describe('Rate ID, can be used to create a label from this rate'),
  carrierCode: z.string().describe('Carrier code (e.g. fedex, ups, usps)'),
  carrierName: z.string().describe('Carrier friendly name'),
  serviceCode: z.string().describe('Service code'),
  serviceType: z.string().describe('Service type description'),
  shippingAmount: z.number().describe('Shipping cost amount'),
  insuranceAmount: z.number().describe('Insurance cost amount'),
  confirmationAmount: z.number().describe('Delivery confirmation cost'),
  otherAmount: z.number().describe('Other charges'),
  currency: z.string().describe('Currency code'),
  deliveryDays: z.number().optional().describe('Estimated delivery days'),
  estimatedDeliveryDate: z.string().optional().describe('Estimated delivery date'),
  guaranteedService: z.boolean().describe('Whether delivery is guaranteed'),
  trackable: z.boolean().describe('Whether the shipment is trackable'),
  negotiatedRate: z.boolean().describe('Whether this is a negotiated rate'),
  packageType: z.string().describe('Package type used for this rate'),
  warnings: z.array(z.string()).describe('Warning messages')
});

export let getRates = SlateTool.create(spec, {
  name: 'Get Shipping Rates',
  key: 'get_rates',
  description: `Compare shipping rates across carriers for a shipment. Provide origin/destination addresses and package details to receive rate quotes from connected carriers. Rates can be filtered by carrier or service. Use the returned rateId to create a label at that rate.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      shipFrom: addressSchema.describe('Origin address'),
      shipTo: addressSchema.describe('Destination address'),
      packages: z.array(packageSchema).min(1).describe('Packages in the shipment'),
      carrierIds: z
        .array(z.string())
        .optional()
        .describe('Filter rates to specific carrier IDs'),
      serviceCodes: z
        .array(z.string())
        .optional()
        .describe('Filter rates to specific service codes')
    })
  )
  .output(
    z.object({
      shipmentId: z.string().describe('Shipment ID created for this rate request'),
      rates: z.array(rateOutputSchema),
      errors: z
        .array(z.any())
        .optional()
        .describe('Any errors from carriers that could not provide rates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getRates({
      shipment: {
        ship_from: mapAddressToApi(ctx.input.shipFrom),
        ship_to: mapAddressToApi(ctx.input.shipTo),
        packages: ctx.input.packages.map(p => ({
          weight: p.weight,
          dimensions: p.dimensions,
          package_code: p.packageCode,
          content_description: p.contentDescription
        }))
      },
      rate_options: {
        carrier_ids: ctx.input.carrierIds,
        service_codes: ctx.input.serviceCodes
      }
    });

    let rates = result.rate_response.rates.map(r => ({
      rateId: r.rate_id,
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
      negotiatedRate: r.negotiated_rate,
      packageType: r.package_type,
      warnings: r.warning_messages
    }));

    let cheapest =
      rates.length > 0
        ? rates.reduce((a, b) => (a.shippingAmount < b.shippingAmount ? a : b))
        : null;

    return {
      output: {
        shipmentId: result.shipment_id,
        rates,
        errors: result.rate_response.errors
      },
      message: `Found **${rates.length}** rate(s).${cheapest ? ` Cheapest: **${cheapest.carrierName} ${cheapest.serviceType}** at **${cheapest.currency} ${cheapest.shippingAmount.toFixed(2)}**${cheapest.deliveryDays ? ` (${cheapest.deliveryDays} days)` : ''}.` : ''}`
    };
  })
  .build();

let mapAddressToApi = (addr: any) => ({
  name: addr.name,
  company_name: addr.companyName,
  phone: addr.phone,
  address_line1: addr.addressLine1,
  address_line2: addr.addressLine2,
  city_locality: addr.cityLocality,
  state_province: addr.stateProvince,
  postal_code: addr.postalCode,
  country_code: addr.countryCode
});
