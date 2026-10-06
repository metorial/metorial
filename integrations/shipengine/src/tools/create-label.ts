import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, type LabelResponse } from '../lib/client';
import { addDocument, type DocumentFormat } from '../lib/files';
import { spec } from '../spec';

let addressSchema = z.object({
  name: z.string().optional().describe('Name of the person'),
  companyName: z.string().optional().describe('Company name'),
  phone: z.string().optional().describe('Phone number'),
  addressLine1: z.string().min(1).describe('Street address line 1'),
  addressLine2: z.string().optional().describe('Street address line 2'),
  cityLocality: z.string().optional().describe('City or locality'),
  stateProvince: z.string().optional().describe('State or province'),
  postalCode: z.string().optional().describe('Postal code'),
  countryCode: z.string().describe('Two-letter ISO country code')
});

let packageSchema = z.object({
  weight: z.object({
    value: z.number().finite().nonnegative().describe('Weight value in the selected unit'),
    unit: z.enum(['pound', 'ounce', 'gram', 'kilogram']).describe('Weight unit')
  }),
  dimensions: z
    .object({
      length: z.number().finite().nonnegative().describe('Length'),
      width: z.number().finite().nonnegative().describe('Width'),
      height: z.number().finite().nonnegative().describe('Height'),
      unit: z.enum(['inch', 'centimeter']).describe('Dimension unit')
    })
    .optional(),
  packageCode: z.string().optional().describe('Carrier-specific package type code'),
  contentDescription: z.string().optional().describe('Description of package contents')
});

let customsItemSchema = z.object({
  description: z.string().describe('Item description'),
  quantity: z.number().int().positive().describe('Quantity'),
  value: z.object({
    amount: z.number().finite().nonnegative().describe('Item value'),
    currency: z.string().describe('Currency code')
  }),
  harmonizedTariffCode: z.string().optional().describe('Harmonized tariff code'),
  countryOfOrigin: z.string().optional().describe('Country of origin code'),
  sku: z.string().optional().describe('SKU')
});

let labelOutputSchema = z.object({
  labelId: z.string().describe('Label ID'),
  shipmentId: z.string().describe('Shipment ID'),
  trackingNumber: z.string().optional().describe('Tracking number'),
  status: z.string().describe('Label status'),
  carrierId: z.string().optional().describe('Carrier ID'),
  carrierCode: z.string().optional().describe('Carrier code'),
  serviceCode: z.string().optional().describe('Service code'),
  shipDate: z.string().optional().describe('Ship date'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  shippingCost: z.number().optional().describe('Shipping cost amount'),
  insuranceCost: z.number().optional().describe('Insurance cost amount'),
  insuranceCurrency: z.string().optional().describe('Currency of insuranceCost'),
  currency: z.string().optional().describe('Currency code'),
  trackable: z.boolean().optional().describe('Whether the shipment is trackable'),
  voided: z.boolean().optional().describe('Whether the label has been voided'),
  isReturnLabel: z.boolean().optional().describe('Whether this is a return label'),
  isInternational: z
    .boolean()
    .optional()
    .describe('Whether this is an international shipment'),
  labelFormat: z.string().optional().describe('Label format (pdf, png, zpl)'),
  labelDownloadUrl: z.string().optional().describe('URL to download the label')
});

export let createLabel = SlateTool.create(spec, {
  name: 'Create Shipping Label',
  key: 'create_label',
  description: `Purchase a shipping label; production requests can charge your account. Provide either full shipment details (addresses, packages, carrier/service) to create a label directly, or a **rateId** from a previous rate lookup, or a **shipmentId** from an existing shipment. The label can be downloaded as PDF, PNG, or ZPL.`,
  instructions: [
    'Provide rateId to create from a previously quoted rate, or shipmentId to create from an existing shipment, or full shipment details for a new label.',
    'When using rateId, shipment details are not required.'
  ],
  tags: {
    readOnly: false,
    destructive: true
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
      packages: z.array(packageSchema).min(1).optional().describe('Packages in the shipment'),
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
    const sourceCount =
      Number(ctx.input.rateId !== undefined) + Number(ctx.input.shipmentId !== undefined);
    const directFields = [
      ctx.input.carrierId,
      ctx.input.serviceCode,
      ctx.input.shipFrom,
      ctx.input.shipTo,
      ctx.input.packages,
      ctx.input.externalShipmentId,
      ctx.input.warehouseId,
      ctx.input.confirmation,
      ctx.input.customs
    ];
    if (sourceCount > 1 || (sourceCount && directFields.some(value => value !== undefined)))
      throw createApiServiceError(
        'Choose exactly one source: rateId, shipmentId, or direct shipment details.'
      );
    if (
      ctx.input.labelLayout === 'letter' &&
      ctx.input.labelFormat &&
      ctx.input.labelFormat !== 'pdf'
    )
      throw createApiServiceError('Letter layout requires PDF format.');
    let client = createClient(ctx);

    let label: LabelResponse;

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
        throw createApiServiceError(
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
    const format = label.label_format ?? ctx.input.labelFormat ?? 'pdf';
    if (!['pdf', 'png', 'zpl'].includes(format))
      throw createApiServiceError(
        'The label format is unsupported. Check the purchased label before retrying.'
      );
    const files = new Set(
      [
        label.label_download?.href,
        ...(label.packages ?? []).map(p => p.label_download?.href)
      ].filter((url): url is string => Boolean(url))
    );
    try {
      for (const [index, url] of [...files].entries())
        await addDocument(
          ctx,
          url,
          `${label.label_id}-${index + 1}`,
          format as DocumentFormat
        );
    } catch {
      const error = createApiServiceError(
        `Label ${label.label_id} was created, but its document could not be prepared. Retrieve that label before retrying; do not purchase another label.`
      );
      Object.assign(error.data, {
        writeMayHaveOccurred: true,
        labelId: label.label_id,
        shipmentId: label.shipment_id
      });
      throw error;
    }

    return {
      output,
      message: `Label **${label.label_id}** has status **${label.status}**. Check its status before attempting another purchase.`
    };
  })
  .build();

let mapAddressToApi = (addr: z.infer<typeof addressSchema>) => ({
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

let mapLabelOutput = (label: LabelResponse) => ({
  labelId: label.label_id,
  shipmentId: label.shipment_id,
  trackingNumber: label.tracking_number,
  status: label.status,
  carrierId: label.carrier_id,
  carrierCode: label.carrier_code,
  serviceCode: label.service_code,
  shipDate: label.ship_date,
  createdAt: label.created_at,
  shippingCost: label.shipment_cost?.amount,
  insuranceCost: label.insurance_cost?.amount,
  insuranceCurrency: label.insurance_cost?.currency,
  currency: label.shipment_cost?.currency,
  trackable: label.trackable,
  voided: label.voided,
  isReturnLabel: label.is_return_label,
  isInternational: label.is_international,
  labelFormat: label.label_format,
  labelDownloadUrl: label.label_download?.href
});
