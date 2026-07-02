import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomField = SlateTool.create(spec, {
  name: 'Manage Custom Field',
  key: 'manage_custom_field',
  description: `Creates, updates, lists, or deletes custom subscriber fields. Custom fields store additional data on subscribers (e.g., name, company, phone). Supported field types are **text**, **number**, and **date**.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      fieldId: z.string().optional().describe('Field ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Field name (required for create and update, max 255 characters)'),
      fieldType: z
        .enum(['text', 'number', 'date'])
        .optional()
        .describe('Field type (required for create)'),
      filterKeyword: z
        .string()
        .optional()
        .describe('Filter fields by keyword (for list action)'),
      filterType: z
        .enum(['text', 'number', 'date'])
        .optional()
        .describe('Filter fields by type (for list action)')
    })
  )
  .output(
    z.object({
      fields: z
        .array(
          z.object({
            fieldId: z.string().describe('Field ID'),
            name: z.string().describe('Field name'),
            fieldKey: z.string().optional().describe('Field key used in subscriber data'),
            fieldType: z.string().describe('Field type')
          })
        )
        .optional()
        .describe('List of fields (for list action)'),
      field: z
        .object({
          fieldId: z.string().describe('Field ID'),
          name: z.string().describe('Field name'),
          fieldKey: z.string().optional().describe('Field key'),
          fieldType: z.string().describe('Field type')
        })
        .optional()
        .describe('Created or updated field'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listFields({
        filter: {
          keyword: ctx.input.filterKeyword,
          type: ctx.input.filterType
        }
      });

      let fields = (result.data || []).map((f: any) => ({
        fieldId: f.id,
        name: f.name,
        fieldKey: f.key,
        fieldType: f.type
      }));

      return {
        output: { fields, success: true },
        message: `Retrieved **${fields.length}** custom fields.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Field name is required for create action');
      if (!ctx.input.fieldType) throw new Error('Field type is required for create action');
      let result = await client.createField({
        name: ctx.input.name,
        type: ctx.input.fieldType
      });
      let f = result.data;
      return {
        output: {
          field: { fieldId: f.id, name: f.name, fieldKey: f.key, fieldType: f.type },
          success: true
        },
        message: `Custom field **${f.name}** (${f.type}) created successfully.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.fieldId) throw new Error('Field ID is required for update action');
      if (!ctx.input.name) throw new Error('Field name is required for update action');
      let result = await client.updateField(ctx.input.fieldId, ctx.input.name);
      let f = result.data;
      return {
        output: {
          field: { fieldId: f.id, name: f.name, fieldKey: f.key, fieldType: f.type },
          success: true
        },
        message: `Custom field **${f.name}** updated successfully.`
      };
    }

    if (!ctx.input.fieldId) throw new Error('Field ID is required for delete action');
    await client.deleteField(ctx.input.fieldId);
    return {
      output: { success: true },
      message: `Custom field **${ctx.input.fieldId}** deleted successfully.`
    };
  })
  .build();
