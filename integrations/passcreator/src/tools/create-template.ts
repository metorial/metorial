import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z
  .object({
    key: z.string().describe('Unique key for the field'),
    label: z.string().optional().describe('Display label for the field'),
    value: z.string().optional().describe('Default value for the field'),
    changeMessage: z
      .string()
      .optional()
      .describe('Message shown on lock screen when this field changes')
  })
  .describe('A pass field definition');

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Pass Template',
  key: 'create_template',
  description: `Create a new pass template that defines the layout, styling, and fields for wallet passes. Templates serve as blueprints from which individual passes are created. Supports coupon, store card, event ticket, generic, and boarding pass types.`,
  instructions: [
    'The passTypeId must reference an existing pass type in your Passcreator account.',
    'Colors should be specified as hex values (e.g., "#FFFFFF").',
    'After creation, use the Publish Template tool to push changes to active passes.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the template'),
      description: z.string().describe('Description of the template'),
      organizationName: z.string().describe('Name of the organization displayed on the pass'),
      type: z
        .enum([
          'coupon',
          'storeCard',
          'eventTicket',
          'eventTicketBackground',
          'generic',
          'boardingPass'
        ])
        .describe('Type of pass template'),
      passTypeId: z.string().describe('Existing pass type ID from the account'),
      barcode: z
        .object({
          format: z
            .string()
            .describe('Barcode format (e.g., PKBarcodeFormatQR, PKBarcodeFormatPDF417)'),
          value: z.string().describe('Barcode value or placeholder'),
          alternativeText: z.string().optional().describe('Text shown below the barcode')
        })
        .describe('Barcode configuration'),
      colors: z
        .object({
          labelColor: z.string().optional().describe('Hex color for field labels'),
          foregroundColor: z.string().optional().describe('Hex color for field values'),
          backgroundColor: z.string().optional().describe('Hex color for the pass background')
        })
        .optional()
        .describe('Color configuration'),
      headerFields: z
        .array(fieldSchema)
        .optional()
        .describe('Fields displayed in the header area'),
      primaryFields: z
        .array(fieldSchema)
        .optional()
        .describe('Fields displayed in the primary area'),
      secondaryFields: z
        .array(fieldSchema)
        .optional()
        .describe('Fields displayed in the secondary area'),
      auxiliaryFields: z
        .array(fieldSchema)
        .optional()
        .describe('Fields displayed in the auxiliary area'),
      backFields: z
        .array(fieldSchema)
        .optional()
        .describe('Fields displayed on the back of the pass'),
      additionalProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional template properties')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier of the created template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name,
      description: ctx.input.description,
      organizationName: ctx.input.organizationName,
      type: ctx.input.type,
      passTypeId: ctx.input.passTypeId,
      barcode: ctx.input.barcode,
      fields: {
        headerFields: ctx.input.headerFields || [],
        primaryFields: ctx.input.primaryFields || [],
        secondaryFields: ctx.input.secondaryFields || [],
        auxiliaryFields: ctx.input.auxiliaryFields || [],
        backFields: ctx.input.backFields || []
      }
    };

    if (ctx.input.colors) {
      body.colors = ctx.input.colors;
    }

    if (ctx.input.additionalProperties) {
      body = { ...body, ...ctx.input.additionalProperties };
    }

    let result = await client.createTemplate(body);
    let templateId = result.data?.identifier || result.identifier;

    return {
      output: { templateId },
      message: `Created pass template **${ctx.input.name}** (type: ${ctx.input.type}) with ID \`${templateId}\`.`
    };
  })
  .build();
