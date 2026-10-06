import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

let customsItemSchema = z.object({
  description: z.string().describe('Description of the item'),
  quantity: z.number().describe('Quantity of items'),
  netWeight: z.string().describe('Total weight of the item'),
  massUnit: z.enum(['g', 'oz', 'lb', 'kg']).describe('Weight unit'),
  valueAmount: z
    .string()
    .describe('Total value for the entire item quantity as an exact decimal string'),
  valueCurrency: z.string().describe('ISO 3-letter currency code (e.g. USD)'),
  originCountry: z.string().describe('ISO 2-letter country of origin'),
  tariffNumber: z.string().optional().describe('HS tariff/harmonized code'),
  skuCode: z
    .string()
    .optional()
    .describe('Merchant product identifier for applicable EU-bound goods.'),
  manufacturerCode: z
    .string()
    .optional()
    .describe('Manufacturer product identifier for applicable EU-bound goods.'),
  manufacturerStandardCode: z
    .string()
    .optional()
    .describe('Optional standardized product identifier.'),
  euExemptCategory: z
    .boolean()
    .optional()
    .describe('Whether this item belongs to a documented EU-exempt product category.'),
  metadata: z.string().optional()
});

export let createCustomsDeclaration = SlateTool.create(spec, {
  name: 'Create Customs Declaration',
  key: 'create_customs_declaration',
  description: `Create a customs declaration for international shipments. Include customs items describing the contents, their values, and countries of origin. Requirements depend on the carrier, destination and contents.`,
  instructions: [
    'Review the carrier’s customs requirements. valueAmount is the total value for the entire item quantity.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientIsBusiness: z
        .boolean()
        .optional()
        .describe(
          'Whether the recipient is a business, affecting documented product-identifier requirements.'
        ),
      contentsType: z
        .enum([
          'DOCUMENTS',
          'GIFT',
          'SAMPLE',
          'MERCHANDISE',
          'HUMANITARIAN_DONATION',
          'RETURN_MERCHANDISE',
          'OTHER'
        ])
        .describe('Type of contents'),
      contentsExplanation: z
        .string()
        .optional()
        .describe('Explanation if contentsType is OTHER'),
      nonDeliveryOption: z
        .enum(['ABANDON', 'RETURN'])
        .optional()
        .describe('Required explicit action if the package cannot be delivered'),
      certify: z.boolean().describe('Whether the information is accurate and certified'),
      certifySigner: z.string().describe('Name of the person certifying the declaration'),
      incoterm: z
        .enum(['DDP', 'DDU', 'FCA', 'DAP', 'CPT', 'CIP', 'CIF', 'FOB', 'EXW', 'eDAP'])
        .optional()
        .describe(
          'Supported values are DDP, DDU, FCA, DAP and eDAP. Other legacy values fail locally with guidance.'
        ),
      aesItn: z
        .string()
        .optional()
        .describe('Required AES/ITN reference when eelPfc is AES_ITN.'),
      eelPfc: z
        .enum(['NOEEI_30_37_a', 'NOEEI_30_37_h', 'NOEEI_30_37_f', 'NOEEI_30_36', 'AES_ITN'])
        .optional()
        .describe('EEL/PFC code for US exports'),
      items: z.array(customsItemSchema).describe('List of customs items'),
      metadata: z.string().optional()
    })
  )
  .output(
    z.object({
      declarationId: z.string().describe('Unique customs declaration identifier'),
      contentsType: z.string().optional(),
      incoterm: z.string().optional(),
      itemCount: z.number().describe('Number of customs items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShippoClient(ctx.auth);

    let items = ctx.input.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      net_weight: item.netWeight,
      mass_unit: item.massUnit,
      value_amount: item.valueAmount,
      value_currency: item.valueCurrency,
      origin_country: item.originCountry,
      tariff_number: item.tariffNumber,
      metadata: item.metadata,
      sku_code: item.skuCode,
      manufacturer_code: item.manufacturerCode,
      manufacturer_standard_code: item.manufacturerStandardCode,
      eu_exempt_category: item.euExemptCategory
    }));

    let result = await client.createCustomsDeclaration({
      contents_type: ctx.input.contentsType,
      recipient_is_business: ctx.input.recipientIsBusiness,
      contents_explanation: ctx.input.contentsExplanation,
      non_delivery_option: ctx.input.nonDeliveryOption,
      certify: ctx.input.certify,
      certify_signer: ctx.input.certifySigner,
      incoterm: ctx.input.incoterm,
      eel_pfc: ctx.input.eelPfc,
      aes_itn: ctx.input.aesItn,
      items,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        declarationId: result.object_id,
        contentsType: result.contents_type,
        incoterm: result.incoterm,
        itemCount: items.length
      },
      message: `Customs declaration created (${result.object_id}) with **${items.length}** items. Type: ${ctx.input.contentsType}.`
    };
  })
  .build();
