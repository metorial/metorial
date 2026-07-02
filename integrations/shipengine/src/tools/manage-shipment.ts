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

let packageSchema = z.object({
  weight: z.object({
    value: z.number().describe('Weight value'),
    unit: z.enum(['pound', 'ounce', 'gram', 'kilogram']).describe('Weight unit')
  }),
  dimensions: z
    .object({
      length: z.number().describe('Length'),
      width: z.number().describe('Width'),
      height: z.number().describe('Height'),
      unit: z.enum(['inch', 'centimeter']).describe('Dimension unit')
    })
    .optional(),
  packageCode: z.string().optional().describe('Carrier-specific package type code')
});

let shipmentOutputSchema = z.object({
  shipmentId: z.string().describe('Shipment ID'),
  carrierId: z.string().describe('Carrier ID'),
  serviceCode: z.string().describe('Service code'),
  externalShipmentId: z.string().optional().describe('External reference ID'),
  shipDate: z.string().describe('Ship date'),
  createdAt: z.string().describe('Creation timestamp'),
  modifiedAt: z.string().describe('Last modification timestamp'),
  shipmentStatus: z.string().describe('Shipment status'),
  shipTo: addressSchema.describe('Destination address'),
  shipFrom: addressSchema.describe('Origin address'),
  warehouseId: z.string().optional().describe('Warehouse ID'),
  confirmation: z.string().optional().describe('Delivery confirmation type'),
  tags: z.array(z.string()).describe('Tags assigned to the shipment')
});

export let createShipment = SlateTool.create(spec, {
  name: 'Create Shipment',
  key: 'create_shipment',
  description: `Create a new shipment with origin/destination addresses, package details, and optional carrier/service selection. The shipment can later be used to get rates or create labels.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      carrierId: z.string().optional().describe('Carrier ID'),
      serviceCode: z.string().optional().describe('Service code'),
      shipFrom: addressSchema.describe('Origin address'),
      shipTo: addressSchema.describe('Destination address'),
      packages: z.array(packageSchema).min(1).describe('Packages in the shipment'),
      shipDate: z.string().optional().describe('Ship date in YYYY-MM-DD format'),
      externalShipmentId: z.string().optional().describe('Your external reference ID'),
      warehouseId: z.string().optional().describe('Warehouse to ship from'),
      confirmation: z
        .enum(['none', 'delivery', 'signature', 'adult_signature', 'direct_signature'])
        .optional()
        .describe('Delivery confirmation type'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the shipment')
    })
  )
  .output(shipmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createShipments([
      {
        carrier_id: ctx.input.carrierId,
        service_code: ctx.input.serviceCode,
        ship_from: mapAddressToApi(ctx.input.shipFrom),
        ship_to: mapAddressToApi(ctx.input.shipTo),
        packages: ctx.input.packages.map(p => ({
          weight: p.weight,
          dimensions: p.dimensions,
          package_code: p.packageCode
        })),
        ship_date: ctx.input.shipDate,
        external_shipment_id: ctx.input.externalShipmentId,
        warehouse_id: ctx.input.warehouseId,
        confirmation: ctx.input.confirmation,
        tags: ctx.input.tags?.map(t => ({ name: t }))
      }
    ]);

    let shipment = result.shipments[0]!;

    return {
      output: mapShipmentOutput(shipment),
      message: `Created shipment **${shipment.shipment_id}** (status: ${shipment.shipment_status}).`
    };
  })
  .build();

export let updateShipment = SlateTool.create(spec, {
  name: 'Update Shipment',
  key: 'update_shipment',
  description: `Update an existing shipment's details such as addresses, packages, carrier, or service. Only provided fields will be updated.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      shipmentId: z.string().describe('ID of the shipment to update'),
      carrierId: z.string().optional().describe('New carrier ID'),
      serviceCode: z.string().optional().describe('New service code'),
      shipFrom: addressSchema.optional().describe('Updated origin address'),
      shipTo: addressSchema.optional().describe('Updated destination address'),
      packages: z.array(packageSchema).optional().describe('Updated packages'),
      shipDate: z.string().optional().describe('Updated ship date')
    })
  )
  .output(shipmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let update: any = {};
    if (ctx.input.carrierId) update.carrier_id = ctx.input.carrierId;
    if (ctx.input.serviceCode) update.service_code = ctx.input.serviceCode;
    if (ctx.input.shipFrom) update.ship_from = mapAddressToApi(ctx.input.shipFrom);
    if (ctx.input.shipTo) update.ship_to = mapAddressToApi(ctx.input.shipTo);
    if (ctx.input.packages)
      update.packages = ctx.input.packages.map(p => ({
        weight: p.weight,
        dimensions: p.dimensions,
        package_code: p.packageCode
      }));
    if (ctx.input.shipDate) update.ship_date = ctx.input.shipDate;

    let shipment = await client.updateShipment(ctx.input.shipmentId, update);

    return {
      output: mapShipmentOutput(shipment),
      message: `Updated shipment **${shipment.shipment_id}**.`
    };
  })
  .build();

export let cancelShipment = SlateTool.create(spec, {
  name: 'Cancel Shipment',
  key: 'cancel_shipment',
  description: `Cancel an existing shipment by its ID. This removes the shipment from ShipEngine.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      shipmentId: z.string().describe('ID of the shipment to cancel')
    })
  )
  .output(
    z.object({
      cancelled: z.boolean().describe('Whether the shipment was cancelled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.cancelShipment(ctx.input.shipmentId);

    return {
      output: { cancelled: true },
      message: `Cancelled shipment **${ctx.input.shipmentId}**.`
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

let mapAddressFromApi = (addr: any) => ({
  name: addr?.name,
  companyName: addr?.company_name,
  phone: addr?.phone,
  addressLine1: addr?.address_line1 ?? '',
  addressLine2: addr?.address_line2,
  cityLocality: addr?.city_locality,
  stateProvince: addr?.state_province,
  postalCode: addr?.postal_code,
  countryCode: addr?.country_code ?? ''
});

let mapShipmentOutput = (s: any) => ({
  shipmentId: s.shipment_id,
  carrierId: s.carrier_id ?? '',
  serviceCode: s.service_code ?? '',
  externalShipmentId: s.external_shipment_id,
  shipDate: s.ship_date,
  createdAt: s.created_at,
  modifiedAt: s.modified_at,
  shipmentStatus: s.shipment_status,
  shipTo: mapAddressFromApi(s.ship_to),
  shipFrom: mapAddressFromApi(s.ship_from),
  warehouseId: s.warehouse_id,
  confirmation: s.confirmation,
  tags: (s.tags || []).map((t: any) => t.name)
});
