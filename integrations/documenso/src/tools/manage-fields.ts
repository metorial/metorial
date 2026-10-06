import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fieldMap } from '../lib/schemas';
import { clientConfig, invalid } from '../lib/validation';
import { spec } from '../spec';

let fieldMetaSchema = z
  .object({
    label: z.string().optional().describe('Field label'),
    placeholder: z.string().optional().describe('Placeholder text'),
    required: z.boolean().optional().describe('Whether the field is required'),
    readOnly: z.boolean().optional().describe('Whether the field is read-only'),
    fontSize: z.number().optional().describe('Font size in pixels'),
    textAlign: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional().describe('Text alignment'),
    value: z
      .string()
      .optional()
      .describe(
        'Prefilled TEXT or NUMBER value; other field types require their native options'
      ),
    values: z
      .array(
        z.object({
          value: z.string(),
          id: z.number().optional(),
          checked: z.boolean().optional()
        })
      )
      .optional()
      .describe('Choice options; CHECKBOX and RADIO require id and checked per option')
  })
  .optional()
  .describe('Field metadata and configuration');

let fieldOutputSchema = z.object({
  fieldId: z.number().describe('Unique identifier of the field'),
  type: z.string().describe('Field type'),
  pageNumber: z.number().describe('Page number where the field is placed'),
  pageX: z.number().describe('X coordinate on the page'),
  pageY: z.number().describe('Y coordinate on the page'),
  width: z.number().describe('Width of the field'),
  height: z.number().describe('Height of the field'),
  envelopeItemId: z.string().optional(),
  recipientId: z.number().optional()
});

export let manageFieldsTool = SlateTool.create(spec, {
  name: 'Manage Fields',
  key: 'manage_fields',
  description: `Add, update, or remove signature/form fields on an envelope. Supports field types: SIGNATURE, INITIALS, NAME, EMAIL, DATE, TEXT, NUMBER, CHECKBOX, RADIO, DROPDOWN. Fields are positioned on specific pages with coordinates and dimensions. Only one action (create, update, or delete) per call.`,
  tags: { destructive: true },
  instructions: [
    'Provide exactly one of: fieldsToCreate, fieldsToUpdate, or fieldIdToDelete.',
    'Coordinates (pageX, pageY) and dimensions (width, height) are percentages from 0 to 100. pageNumber starts at 1.'
  ]
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to manage fields for'),
      fieldsToCreate: z
        .array(
          z.object({
            type: z
              .enum([
                'SIGNATURE',
                'INITIALS',
                'NAME',
                'EMAIL',
                'DATE',
                'TEXT',
                'NUMBER',
                'CHECKBOX',
                'RADIO',
                'DROPDOWN'
              ])
              .describe('Type of field'),
            recipientId: z.number().describe('ID of the recipient this field is assigned to'),
            envelopeItemId: z
              .string()
              .optional()
              .describe('ID of the specific envelope item (document) for the field'),
            pageNumber: z.number().describe('Page number (1-based) to place the field on'),
            pageX: z.number().describe('X coordinate on the page'),
            pageY: z.number().describe('Y coordinate on the page'),
            width: z.number().describe('Width of the field'),
            height: z.number().describe('Height of the field'),
            fieldMeta: fieldMetaSchema
          })
        )
        .optional()
        .describe('Fields to add to the envelope'),
      fieldsToUpdate: z
        .array(
          z.object({
            fieldId: z.number().describe('ID of the field to update'),
            type: z
              .enum([
                'SIGNATURE',
                'INITIALS',
                'NAME',
                'EMAIL',
                'DATE',
                'TEXT',
                'NUMBER',
                'CHECKBOX',
                'RADIO',
                'DROPDOWN'
              ])
              .optional()
              .describe('Updated field type'),
            pageNumber: z.number().optional().describe('Updated page number'),
            pageX: z.number().optional().describe('Updated X coordinate'),
            pageY: z.number().optional().describe('Updated Y coordinate'),
            width: z.number().optional().describe('Updated width'),
            height: z.number().optional().describe('Updated height'),
            fieldMeta: fieldMetaSchema
          })
        )
        .optional()
        .describe('Fields to update'),
      fieldIdToDelete: z.number().optional().describe('ID of the field to remove')
    })
  )
  .output(
    z.object({
      fields: z.array(fieldOutputSchema).optional().describe('Created or updated fields'),
      deleted: z.boolean().optional().describe('Whether the field was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    const count =
      Number(input.fieldsToCreate !== undefined) +
      Number(input.fieldsToUpdate !== undefined) +
      Number(input.fieldIdToDelete !== undefined);
    if (count !== 1) throw invalid('Provide exactly one create, update, or delete action.');
    const client = new Client(clientConfig(ctx));
    if (input.fieldsToCreate !== undefined) {
      const r = await client.createFields(input.envelopeId, input.fieldsToCreate);
      return {
        output: { fields: r.data.map(fieldMap) },
        message: `Created ${r.data.length} fields.`
      };
    }
    if (input.fieldsToUpdate !== undefined) {
      const r = await client.updateFields(input.envelopeId, input.fieldsToUpdate);
      return {
        output: { fields: r.data.map(fieldMap) },
        message: `Updated ${r.data.length} fields.`
      };
    }
    if (input.fieldIdToDelete === undefined) throw invalid('Provide the exact field ID.');
    await client.deleteField(input.envelopeId, input.fieldIdToDelete);
    return { output: { deleted: true }, message: 'Documenso acknowledged field deletion.' };
  })
  .build();
