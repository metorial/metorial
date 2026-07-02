import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_fields',
  description: `Create, update, or delete custom contact fields. Custom fields allow storing additional data on contacts (e.g., city, company, preferences). Fields are global across all lists.
Use **action** to specify the operation.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      fieldId: z.number().optional().describe('Field ID (required for update and delete)'),
      name: z.string().optional().describe('Internal field name (required for create)'),
      publicName: z.string().optional().describe('Public display name for the field'),
      fieldType: z
        .enum(['string', 'text', 'number', 'date', 'bool'])
        .optional()
        .describe('Field data type (only for create)')
    })
  )
  .output(
    z.object({
      fieldId: z.number().optional().describe('ID of the created or updated field'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required when creating a field');
      let result = await client.createField({
        name: ctx.input.name,
        type: ctx.input.fieldType,
        public_name: ctx.input.publicName
      });
      return {
        output: { fieldId: result.id, success: true },
        message: `Created field **"${ctx.input.name}"** with ID \`${result.id}\``
      };
    }

    if (action === 'update') {
      if (!ctx.input.fieldId) throw new Error('fieldId is required when updating a field');
      await client.updateField({
        id: ctx.input.fieldId,
        name: ctx.input.name,
        public_name: ctx.input.publicName
      });
      return {
        output: { fieldId: ctx.input.fieldId, success: true },
        message: `Updated field \`${ctx.input.fieldId}\``
      };
    }

    if (action === 'delete') {
      if (!ctx.input.fieldId) throw new Error('fieldId is required when deleting a field');
      await client.deleteField(ctx.input.fieldId);
      return {
        output: { fieldId: ctx.input.fieldId, success: true },
        message: `Deleted field \`${ctx.input.fieldId}\``
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
