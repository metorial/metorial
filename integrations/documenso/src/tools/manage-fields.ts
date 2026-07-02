import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldMetaSchema = z
  .object({
    label: z.string().optional().describe('Field label'),
    placeholder: z.string().optional().describe('Placeholder text'),
    required: z.boolean().optional().describe('Whether the field is required'),
    readOnly: z.boolean().optional().describe('Whether the field is read-only'),
    fontSize: z.number().optional().describe('Font size in pixels'),
    textAlign: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional().describe('Text alignment'),
    value: z.string().optional().describe('Prefilled value')
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
  height: z.number().describe('Height of the field')
});

export let manageFieldsTool = SlateTool.create(spec, {
  name: 'Manage Fields',
  key: 'manage_fields',
  description: `Add, update, or remove signature/form fields on an envelope. Supports field types: SIGNATURE, INITIALS, NAME, EMAIL, DATE, TEXT, NUMBER, CHECKBOX, RADIO, DROPDOWN. Fields are positioned on specific pages with coordinates and dimensions. Only one action (create, update, or delete) per call.`,
  instructions: [
    'Provide exactly one of: fieldsToCreate, fieldsToUpdate, or fieldIdToDelete.',
    'Coordinates (pageX, pageY) and dimensions (width, height) are relative to the page.'
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
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.fieldsToCreate && ctx.input.fieldsToCreate.length > 0) {
      let result = await client.createFields(ctx.input.envelopeId, ctx.input.fieldsToCreate);
      let items = Array.isArray(result) ? result : (result.data ?? []);

      return {
        output: {
          fields: items.map((f: Record<string, unknown>) => ({
            fieldId: Number(f.id ?? f.fieldId ?? 0),
            type: String(f.type ?? ''),
            pageNumber: Number(f.pageNumber ?? f.page ?? 0),
            pageX: Number(f.pageX ?? f.positionX ?? 0),
            pageY: Number(f.pageY ?? f.positionY ?? 0),
            width: Number(f.width ?? 0),
            height: Number(f.height ?? 0)
          }))
        },
        message: `Created ${items.length} field(s) on envelope \`${ctx.input.envelopeId}\`.`
      };
    }

    if (ctx.input.fieldsToUpdate && ctx.input.fieldsToUpdate.length > 0) {
      let result = await client.updateFields(ctx.input.envelopeId, ctx.input.fieldsToUpdate);
      let items = Array.isArray(result) ? result : (result.data ?? []);

      return {
        output: {
          fields: items.map((f: Record<string, unknown>) => ({
            fieldId: Number(f.id ?? f.fieldId ?? 0),
            type: String(f.type ?? ''),
            pageNumber: Number(f.pageNumber ?? f.page ?? 0),
            pageX: Number(f.pageX ?? f.positionX ?? 0),
            pageY: Number(f.pageY ?? f.positionY ?? 0),
            width: Number(f.width ?? 0),
            height: Number(f.height ?? 0)
          }))
        },
        message: `Updated ${items.length} field(s) on envelope \`${ctx.input.envelopeId}\`.`
      };
    }

    if (ctx.input.fieldIdToDelete != null) {
      await client.deleteField(ctx.input.fieldIdToDelete);
      return {
        output: { deleted: true },
        message: `Deleted field \`${ctx.input.fieldIdToDelete}\` from envelope \`${ctx.input.envelopeId}\`.`
      };
    }

    return {
      output: {},
      message: 'No field action specified.'
    };
  })
  .build();
