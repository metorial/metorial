import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { spec } from '../spec';

let customsItemSchema = z.object({
  description: z.string().describe('Description of the item'),
  quantity: z.number().describe('Quantity of items'),
  netWeight: z.string().describe('Total weight of the item'),
  massUnit: z.enum(['g', 'oz', 'lb', 'kg']).describe('Weight unit'),
  valueAmount: z.string().describe('Value per item'),
  valueCurrency: z.string().describe('ISO 3-letter currency code (e.g. USD)'),
  originCountry: z.string().describe('ISO 2-letter country of origin'),
  tariffNumber: z.string().optional().describe('HS tariff/harmonized code'),
  metadata: z.string().optional()
});

export let createCustomsDeclaration = SlateTool.create(spec, {
  name: 'Create Customs Declaration',
  key: 'create_customs_declaration',
  description: `Create a customs declaration for international shipments. Include customs items describing the contents, their values, and countries of origin. Required for all cross-border shipments.`,
  instructions: [
    'Most carriers require certify, certifySigner, contentsType, eelPfc, and incoterm to be provided.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
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
        .describe('Action if package cannot be delivered'),
      certify: z.boolean().describe('Whether the information is accurate and certified'),
      certifySigner: z.string().describe('Name of the person certifying the declaration'),
      incoterm: z
        .enum(['DDP', 'DDU', 'FCA', 'DAP', 'CPT', 'CIP', 'CIF', 'FOB', 'EXW'])
        .optional()
        .describe('Incoterms trade term'),
      eelPfc: z
        .enum(['NOEEI_30_37_a', 'NOEEI_30_37_h', 'NOEEI_30_36', 'AES_ITN'])
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
    let client = new ShippoClient(ctx.auth.token);

    let items = ctx.input.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      net_weight: item.netWeight,
      mass_unit: item.massUnit,
      value_amount: item.valueAmount,
      value_currency: item.valueCurrency,
      origin_country: item.originCountry,
      tariff_number: item.tariffNumber,
      metadata: item.metadata
    }));

    let result = (await client.createCustomsDeclaration({
      contents_type: ctx.input.contentsType,
      contents_explanation: ctx.input.contentsExplanation,
      non_delivery_option: ctx.input.nonDeliveryOption,
      certify: ctx.input.certify,
      certify_signer: ctx.input.certifySigner,
      incoterm: ctx.input.incoterm,
      eel_pfc: ctx.input.eelPfc,
      items,
      metadata: ctx.input.metadata
    })) as Record<string, any>;

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
