import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

let addressInput = z.union([
  z.string().describe('Existing address object ID'),
  z
    .object({
      name: z.string(),
      company: z.string().optional(),
      street1: z.string(),
      street2: z.string().optional(),
      street3: z.string().optional(),
      city: z.string(),
      state: z.string().optional(),
      zip: z.string(),
      country: z.string().describe('ISO 2-letter country code'),
      phone: z.string().optional(),
      email: z.string().optional()
    })
    .describe('Inline address object')
]);

let parcelInput = z.union([
  z.string().describe('Existing parcel object ID'),
  z
    .object({
      length: z.string().describe('Length of the parcel'),
      width: z.string().describe('Width of the parcel'),
      height: z.string().describe('Height of the parcel'),
      distanceUnit: z
        .enum(['cm', 'in', 'ft', 'mm', 'm', 'yd'])
        .describe('Unit for dimensions'),
      weight: z.string().describe('Weight of the parcel'),
      massUnit: z.enum(['g', 'oz', 'lb', 'kg']).describe('Unit for weight'),
      template: z
        .string()
        .optional()
        .describe('Carrier parcel template token (e.g. USPS_FlatRateEnvelope)'),
      metadata: z.string().optional()
    })
    .describe('Inline parcel object')
]);

export let createShipment = SlateTool.create(spec, {
  name: 'Create Shipment',
  key: 'create_shipment',
  description: `Create a shipment to get available shipping rates from all connected carriers. Provide sender/recipient addresses and parcel details. Rates are automatically generated and can be used to purchase labels. Supports inline address/parcel objects or existing object IDs.`,
  instructions: [
    'You can pass address and parcel as either an existing object ID (string) or an inline object with full details.',
    'For international shipments, include a customsDeclarationId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      addressFrom: addressInput.describe('Sender address (object ID or inline address)'),
      addressTo: addressInput.describe('Recipient address (object ID or inline address)'),
      parcels: z.array(parcelInput).describe('One or more parcels for the shipment'),
      customsDeclarationId: z
        .string()
        .optional()
        .describe('Customs declaration ID for international shipments'),
      carrierAccounts: z
        .array(z.string())
        .optional()
        .describe('Limit rate retrieval to specific carrier account IDs'),
      metadata: z.string().optional().describe('Custom metadata for the shipment'),
      async: z
        .boolean()
        .optional()
        .describe('Set to true for async rate generation (recommended for many carriers)')
    })
  )
  .output(
    z.object({
      shipmentId: z.string().describe('Unique shipment identifier'),
      status: z.string().optional().describe('Shipment status'),
      addressFrom: z.any().optional().describe('Sender address details'),
      addressTo: z.any().optional().describe('Recipient address details'),
      rates: z
        .array(
          z.object({
            rateId: z.string(),
            provider: z.string().optional(),
            servicelevel: z.string().optional(),
            amount: z.string().optional(),
            currency: z.string().optional(),
            estimatedDays: z.number().optional(),
            durationTerms: z.string().optional()
          })
        )
        .optional()
        .describe('Available shipping rates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth.token);

    let addressFrom =
      typeof ctx.input.addressFrom === 'string'
        ? ctx.input.addressFrom
        : {
            ...ctx.input.addressFrom,
            distance_unit: undefined
          };

    let addressTo =
      typeof ctx.input.addressTo === 'string'
        ? ctx.input.addressTo
        : {
            ...ctx.input.addressTo,
            distance_unit: undefined
          };

    let parcels = ctx.input.parcels.map(p => {
      if (typeof p === 'string') return p;
      return {
        length: p.length,
        width: p.width,
        height: p.height,
        distance_unit: p.distanceUnit,
        weight: p.weight,
        mass_unit: p.massUnit,
        template: p.template,
        metadata: p.metadata
      };
    });

    let result = (await client.createShipment({
      address_from: addressFrom,
      address_to: addressTo,
      parcels,
      customs_declaration: ctx.input.customsDeclarationId,
      carrier_accounts: ctx.input.carrierAccounts,
      metadata: ctx.input.metadata,
      async: ctx.input.async
    })) as Record<string, any>;

    let rates = (result.rates || []).map((r: any) => ({
      rateId: r.object_id,
      provider: r.provider,
      servicelevel: r.servicelevel?.name,
      amount: r.amount,
      currency: r.currency,
      estimatedDays: r.estimated_days,
      durationTerms: r.duration_terms
    }));

    return {
      output: {
        shipmentId: result.object_id,
        status: result.status,
        addressFrom: result.address_from,
        addressTo: result.address_to,
        rates
      },
      message: `Shipment created (${result.object_id}). Found **${rates.length}** available rates.${rates.length > 0 ? ` Cheapest: ${rates[0].provider} ${rates[0].servicelevel} at ${rates[0].amount} ${rates[0].currency}.` : ''}`
    };
  })
  .build();
