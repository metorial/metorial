import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.string().describe('Unique identifier for the custom metadata field'),
  name: z.string().describe('Internal name of the field'),
  label: z.string().describe('Display label'),
  schema: z
    .record(z.string(), z.any())
    .describe('Field schema definition including type, constraints, and default values')
});

export let manageCustomMetadataFields = SlateTool.create(spec, {
  name: 'Manage Custom Metadata Fields',
  key: 'manage_custom_metadata_fields',
  description: `Create, list, update, or delete custom metadata field definitions in the ImageKit Media Library. Custom metadata fields can be of types: Text, Textarea, Number, Date, Boolean, SingleSelect, MultiSelect.`,
  instructions: [
    'Schema type must be one of: "Text", "Textarea", "Number", "Date", "Boolean", "SingleSelect", "MultiSelect"',
    'Schema properties include: type, defaultValue, isValueRequired, minValue, maxValue, minLength, maxLength'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      fieldId: z.string().optional().describe('Field ID (required for update and delete)'),
      name: z.string().optional().describe('Internal field name (required for create)'),
      label: z
        .string()
        .optional()
        .describe('Display label (required for create, optional for update)'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Field schema definition, e.g. {"type": "Number", "minValue": 0, "maxValue": 100}'
        ),
      includeDeleted: z.boolean().optional().describe('Include deleted fields in list results')
    })
  )
  .output(
    z.object({
      fields: z
        .array(fieldSchema)
        .optional()
        .describe('List of custom metadata fields (for list operation)'),
      field: fieldSchema
        .optional()
        .describe('Created or updated field (for create/update operations)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the field was deleted (for delete operation)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.operation === 'list') {
      let fields = await client.listCustomMetadataFields(ctx.input.includeDeleted);
      let mapped = (fields as any[]).map((f: any) => ({
        fieldId: f.id,
        name: f.name,
        label: f.label,
        schema: f.schema
      }));

      return {
        output: { fields: mapped },
        message: `Found **${mapped.length}** custom metadata field(s).`
      };
    }

    if (ctx.input.operation === 'create') {
      if (!ctx.input.name || !ctx.input.label || !ctx.input.schema) {
        throw new Error('name, label, and schema are required for create operation');
      }
      let result = await client.createCustomMetadataField({
        name: ctx.input.name,
        label: ctx.input.label,
        schema: ctx.input.schema
      });

      return {
        output: {
          field: {
            fieldId: result.id,
            name: result.name,
            label: result.label,
            schema: result.schema
          }
        },
        message: `Created custom metadata field **${result.label}** (${result.name}).`
      };
    }

    if (ctx.input.operation === 'update') {
      if (!ctx.input.fieldId) throw new Error('fieldId is required for update operation');
      let params: { label?: string; schema?: Record<string, any> } = {};
      if (ctx.input.label) params.label = ctx.input.label;
      if (ctx.input.schema) params.schema = ctx.input.schema;

      let result = await client.updateCustomMetadataField(ctx.input.fieldId, params);

      return {
        output: {
          field: {
            fieldId: result.id,
            name: result.name,
            label: result.label,
            schema: result.schema
          }
        },
        message: `Updated custom metadata field **${result.label}**.`
      };
    }

    if (ctx.input.operation === 'delete') {
      if (!ctx.input.fieldId) throw new Error('fieldId is required for delete operation');
      await client.deleteCustomMetadataField(ctx.input.fieldId);

      return {
        output: { deleted: true },
        message: `Deleted custom metadata field \`${ctx.input.fieldId}\`.`
      };
    }

    throw new Error(`Unknown operation: ${ctx.input.operation}`);
  })
  .build();
