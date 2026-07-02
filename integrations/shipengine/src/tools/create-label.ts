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
  packageCode: z.string().optional().describe('Carrier-specific package type code'),
  contentDescription: z.string().optional().describe('Description of package contents')
});

let customsItemSchema = z.object({
  description: z.string().describe('Item description'),
  quantity: z.number().describe('Quantity'),
  value: z.object({
    amount: z.number().describe('Item value'),
    currency: z.string().describe('Currency code')
  }),
  harmonizedTariffCode: z.string().optional().describe('Harmonized tariff code'),
  countryOfOrigin: z.string().optional().describe('Country of origin code'),
  sku: z.string().optional().describe('SKU')
});

let labelOutputSchema = z.object({
  labelId: z.string().describe('Label ID'),
  shipmentId: z.string().describe('Shipment ID'),
  trackingNumber: z.string().describe('Tracking number'),
  status: z.string().describe('Label status'),
  carrierId: z.string().describe('Carrier ID'),
  carrierCode: z.string().describe('Carrier code'),
  serviceCode: z.string().describe('Service code'),
  shipDate: z.string().describe('Ship date'),
  createdAt: z.string().describe('Creation timestamp'),
  shippingCost: z.number().describe('Shipping cost amount'),
  insuranceCost: z.number().describe('Insurance cost amount'),
  currency: z.string().describe('Currency code'),
  trackable: z.boolean().describe('Whether the shipment is trackable'),
  voided: z.boolean().describe('Whether the label has been voided'),
  isReturnLabel: z.boolean().describe('Whether this is a return label'),
  isInternational: z.boolean().describe('Whether this is an international shipment'),
  labelFormat: z.string().describe('Label format (pdf, png, zpl)'),
  labelDownloadUrl: z.string().describe('URL to download the label')
});

export let createLabel = SlateTool.create(spec, {
  name: 'Create Shipping Label',
  key: 'create_label',
  description: `Create a shipping label. Provide either full shipment details (addresses, packages, carrier/service) to create a label directly, or a **rateId** from a previous rate lookup, or a **shipmentId** from an existing shipment. The label can be downloaded as PDF, PNG, or ZPL.`,
  instructions: [
    'Provide rateId to create from a previously quoted rate, or shipmentId to create from an existing shipment, or full shipment details for a new label.',
    'When using rateId, shipment details are not required.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      rateId: z.string().optional().describe('Create label from a previously quoted rate ID'),
      shipmentId: z.string().optional().describe('Create label from an existing shipment ID'),
      carrierId: z
        .string()
        .optional()
        .describe('Carrier ID (required for direct label creation)'),
      serviceCode: z
        .string()
        .optional()
        .describe('Service code (required for direct label creation)'),
      shipFrom: addressSchema.optional().describe('Origin address'),
      shipTo: addressSchema.optional().describe('Destination address'),
      packages: z.array(packageSchema).optional().describe('Packages in the shipment'),
      labelFormat: z.enum(['pdf', 'png', 'zpl']).optional().describe('Label format'),
      labelLayout: z.enum(['4x6', 'letter']).optional().describe('Label layout size'),
      externalShipmentId: z
        .string()
        .optional()
        .describe('External reference ID for the shipment'),
      warehouseId: z.string().optional().describe('Warehouse to ship from'),
      confirmation: z
        .enum(['none', 'delivery', 'signature', 'adult_signature', 'direct_signature'])
        .optional()
        .describe('Delivery confirmation type'),
      customs: z
        .object({
          contents: z
            .enum(['merchandise', 'gift', 'returned_goods', 'documents', 'sample'])
            .describe('Contents type'),
          nonDelivery: z
            .enum(['treat_as_abandoned', 'return_to_sender'])
            .describe('Non-delivery handling'),
          items: z.array(customsItemSchema).describe('Customs items')
        })
        .optional()
        .describe('Customs information for international shipments')
    })
  )
  .output(labelOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let label: any;

    if (ctx.input.rateId) {
      label = await client.createLabelFromRate(ctx.input.rateId, {
        label_format: ctx.input.labelFormat,
        label_layout: ctx.input.labelLayout
      });
    } else if (ctx.input.shipmentId) {
      label = await client.createLabelFromShipment(ctx.input.shipmentId, {
        label_format: ctx.input.labelFormat,
        label_layout: ctx.input.labelLayout
      });
    } else {
      if (
        !ctx.input.carrierId ||
        !ctx.input.serviceCode ||
        !ctx.input.shipFrom ||
        !ctx.input.shipTo ||
        !ctx.input.packages
      ) {
        throw new Error(
          'When creating a label directly, carrierId, serviceCode, shipFrom, shipTo, and packages are required.'
        );
      }

      label = await client.createLabel({
        shipment: {
          carrier_id: ctx.input.carrierId,
          service_code: ctx.input.serviceCode,
          ship_from: mapAddressToApi(ctx.input.shipFrom),
          ship_to: mapAddressToApi(ctx.input.shipTo),
          packages: ctx.input.packages.map(p => ({
            weight: p.weight,
            dimensions: p.dimensions,
            package_code: p.packageCode,
            content_description: p.contentDescription
          })),
          confirmation: ctx.input.confirmation,
          external_shipment_id: ctx.input.externalShipmentId,
          warehouse_id: ctx.input.warehouseId,
          customs: ctx.input.customs
            ? {
                contents: ctx.input.customs.contents,
                non_delivery: ctx.input.customs.nonDelivery,
                customs_items: ctx.input.customs.items.map(item => ({
                  description: item.description,
                  quantity: item.quantity,
                  value: item.value,
                  harmonized_tariff_code: item.harmonizedTariffCode,
                  country_of_origin: item.countryOfOrigin,
                  sku: item.sku
                }))
              }
            : undefined
        },
        label_format: ctx.input.labelFormat,
        label_layout: ctx.input.labelLayout
      });
    }

    let output = mapLabelOutput(label);

    return {
      output,
      message: `Created label **${label.label_id}** via **${label.carrier_code}** (${label.service_code}). Tracking: **${label.tracking_number}**. Cost: **${label.shipment_cost.currency} ${label.shipment_cost.amount.toFixed(2)}**.`
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

let mapLabelOutput = (label: any) => ({
  labelId: label.label_id,
  shipmentId: label.shipment_id,
  trackingNumber: label.tracking_number,
  status: label.status,
  carrierId: label.carrier_id,
  carrierCode: label.carrier_code,
  serviceCode: label.service_code,
  shipDate: label.ship_date,
  createdAt: label.created_at,
  shippingCost: label.shipment_cost?.amount ?? 0,
  insuranceCost: label.insurance_cost?.amount ?? 0,
  currency: label.shipment_cost?.currency ?? 'usd',
  trackable: label.trackable,
  voided: label.voided,
  isReturnLabel: label.is_return_label,
  isInternational: label.is_international,
  labelFormat: label.label_format,
  labelDownloadUrl: label.label_download?.href ?? ''
});
