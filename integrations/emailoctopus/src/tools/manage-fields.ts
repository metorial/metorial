import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { listIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_fields',
  description: `Create, update, or delete custom fields on a contact list. Custom fields store additional contact data (e.g., first name, company). Supported types: TEXT, NUMBER, DATE; these inputs are sent as lowercase API values.
Use **action** to specify the operation: \`create\`, \`update\`, or \`delete\`. Existing fields can be viewed using the Get List tool.`,
  instructions: [
    'Omitted update values preserve existing metadata. Check existing contact values before requesting a different field type.',
    'Fields that are used in list segments cannot be deleted.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      listId: listIdSchema,
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      tag: z.string().describe('Field tag identifier. Used as the field key in contact data.'),
      label: z
        .string()
        .optional()
        .describe('Display label for the field. Required for create.'),
      type: z
        .enum(['TEXT', 'NUMBER', 'DATE'])
        .optional()
        .describe(
          'Field type. Required for create; omitted update values preserve the existing type.'
        ),
      clearFallback: z
        .boolean()
        .optional()
        .describe(
          'Clear the campaign fallback for create or update; do not combine with fallback'
        ),
      fallback: z
        .string()
        .optional()
        .describe(
          'Default campaign value. Omitted update values preserve the existing fallback'
        )
    })
  )
  .output(
    z.object({
      field: z
        .object({
          tag: z.string(),
          type: z.string(),
          label: z.string(),
          fallback: z
            .string()
            .describe(
              'Fallback display text; absent or null provider fallback is an empty string'
            ),
          fallbackValue: z
            .string()
            .nullable()
            .optional()
            .describe('Original provider fallback, when supplied')
        })
        .optional()
        .describe('The created or updated field (returned for create and update actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the field was deleted (returned for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, listId, tag, label, type } = ctx.input;
    if (ctx.input.clearFallback && ctx.input.fallback !== undefined)
      throw invalid('Do not combine fallback with clearFallback.');
    let fallback = ctx.input.clearFallback ? null : ctx.input.fallback;

    if (action === 'create') {
      if (!label) throw invalid('Label is required for create action.');
      if (!type) throw invalid('Type is required for create action.');
      let field = await client.createField(listId, { label, tag, type, fallback });
      return {
        output: { field },
        message: `Created custom field **${field.label}** (\`${field.tag}\`, type: ${field.type}).`
      };
    }

    if (action === 'update') {
      let field = await client.updateField(listId, tag, { label, type, fallback });
      return {
        output: { field },
        message: `Updated custom field **${field.label}** (\`${field.tag}\`).`
      };
    }

    if (action === 'delete') {
      await client.deleteField(listId, tag);
      return {
        output: { deleted: true },
        message: `Deleted custom field \`${client.safeText(tag)}\`.`
      };
    }

    throw invalid(`Unknown action: ${action}`);
  })
  .build();
