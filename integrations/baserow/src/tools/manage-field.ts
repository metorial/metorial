import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageField = SlateTool.create(spec, {
  name: 'Manage Field',
  key: 'manage_field',
  description: `Create, update, or delete a field (column) in a Baserow table. Use \`action\` to specify the operation. Requires JWT authentication.`,
  instructions: [
    'For creating a field, provide `tableId`, `name`, and `type`. Additional type-specific options can go in `options`.',
    'Supported field types include: text, long_text, number, boolean, date, url, email, file, single_select, multiple_select, link_row, lookup, rollup, count, formula, rating, duration, uuid, autonumber, and more.',
    'For single_select/multiple_select, include `select_options` in `options` with an array of `{ value, color }` objects.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      tableId: z.number().optional().describe('Table ID (required for create)'),
      fieldId: z.number().optional().describe('Field ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Field name (required for create, optional for update)'),
      type: z
        .string()
        .optional()
        .describe(
          'Field type (required for create, e.g. text, number, boolean, date, single_select)'
        ),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Additional type-specific field options (e.g. number_decimal_places, date_format, select_options)'
        )
    })
  )
  .output(
    z.object({
      field: z
        .object({
          fieldId: z.number().describe('Field ID'),
          name: z.string().describe('Field name'),
          type: z.string().describe('Field type')
        })
        .catchall(z.any())
        .optional()
        .describe('The created or updated field (not returned for delete)'),
      deleted: z.boolean().optional().describe('True if the field was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.tableId) throw new Error('tableId is required for creating a field');
      if (!ctx.input.name) throw new Error('name is required for creating a field');
      if (!ctx.input.type) throw new Error('type is required for creating a field');

      let fieldData: Record<string, any> = {
        name: ctx.input.name,
        type: ctx.input.type,
        ...ctx.input.options
      };

      let field = await client.createField(ctx.input.tableId, fieldData);

      return {
        output: {
          field: { fieldId: field.id, name: field.name, type: field.type, ...field }
        },
        message: `Created field **${field.name}** (type: ${field.type}) in table ${ctx.input.tableId}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.fieldId) throw new Error('fieldId is required for updating a field');

      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.type) updateData.type = ctx.input.type;
      if (ctx.input.options) Object.assign(updateData, ctx.input.options);

      let field = await client.updateField(ctx.input.fieldId, updateData);

      return {
        output: {
          field: { fieldId: field.id, name: field.name, type: field.type, ...field }
        },
        message: `Updated field **${field.name}** (ID: ${field.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.fieldId) throw new Error('fieldId is required for deleting a field');

      await client.deleteField(ctx.input.fieldId);

      return {
        output: { deleted: true },
        message: `Deleted field ${ctx.input.fieldId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
