import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { airtableServiceError } from '../lib/errors';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let manageFieldTool = SlateTool.create(spec, {
  name: 'Manage Field',
  key: 'manage_field',
  description: `Create a new field or update an existing field in a table within the specified Airtable base. Airtable's metadata API requires table and field IDs for this operation.`,
  instructions: [
    'To create a field, set **action** to "create" and provide fieldName, fieldType, and optionally options.',
    'To update a field, set **action** to "update" and provide fieldId with the changes.',
    'Some advanced field types (e.g. formula) cannot be created via API.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      baseId: baseIdInput,
      action: z
        .enum(['create', 'update'])
        .describe('Whether to create a new field or update an existing one'),
      tableIdOrName: z.string().describe('Table ID containing the field'),
      fieldId: z.string().optional().describe('Field ID to update (required for update)'),
      fieldName: z.string().optional().describe('Name for the field'),
      fieldType: z
        .string()
        .optional()
        .describe(
          'Field type (required for create; e.g. singleLineText, number, singleSelect)'
        ),
      description: z.string().optional().describe('Description for the field'),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field type-specific options (e.g. choices for select fields)')
    })
  )
  .output(
    z.object({
      fieldId: z.string().describe('Field ID'),
      fieldName: z.string().describe('Field name'),
      fieldType: z.string().describe('Field type'),
      description: z.string().optional().describe('Field description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.fieldName) {
        throw airtableServiceError('fieldName is required when creating a field');
      }
      if (!ctx.input.fieldType) {
        throw airtableServiceError('fieldType is required when creating a field');
      }

      let result = await client.createField(ctx.input.tableIdOrName, {
        name: ctx.input.fieldName,
        type: ctx.input.fieldType,
        description: ctx.input.description,
        options: ctx.input.options
      });

      return {
        output: {
          fieldId: result.id,
          fieldName: result.name,
          fieldType: result.type,
          description: result.description
        },
        message: `Created field **${result.name}** (${result.type}) in table **${ctx.input.tableIdOrName}**.`
      };
    } else {
      if (!ctx.input.fieldId) {
        throw airtableServiceError('fieldId is required when updating a field');
      }

      let updates: { name?: string; description?: string; options?: Record<string, any> } = {};
      if (ctx.input.fieldName) updates.name = ctx.input.fieldName;
      if (ctx.input.description !== undefined) updates.description = ctx.input.description;
      if (ctx.input.options) updates.options = ctx.input.options;

      let result = await client.updateField(
        ctx.input.tableIdOrName,
        ctx.input.fieldId,
        updates
      );

      return {
        output: {
          fieldId: result.id,
          fieldName: result.name,
          fieldType: result.type,
          description: result.description
        },
        message: `Updated field **${result.name}** in table **${ctx.input.tableIdOrName}**.`
      };
    }
  })
  .build();
