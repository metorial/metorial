import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_fields',
  description: `Create, update, or delete custom fields on a contact list. Custom fields store additional contact data (e.g., first name, company). Supported types: TEXT, NUMBER, DATE.
Use **action** to specify the operation: \`create\`, \`update\`, or \`delete\`. Existing fields can be viewed using the Get List tool.`,
  instructions: [
    'Field type cannot be changed after creation.',
    'Fields that are used in list segments cannot be deleted.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to manage fields on'),
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      tag: z.string().describe('Field tag identifier. Used as the field key in contact data.'),
      label: z
        .string()
        .optional()
        .describe('Display label for the field. Required for create.'),
      type: z
        .enum(['TEXT', 'NUMBER', 'DATE'])
        .optional()
        .describe('Field type. Required for create. Cannot be changed after creation.'),
      fallback: z
        .string()
        .optional()
        .describe('Default value used in campaigns when no value is available')
    })
  )
  .output(
    z.object({
      field: z
        .object({
          tag: z.string(),
          type: z.string(),
          label: z.string(),
          fallback: z.string()
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
    let { action, listId, tag, label, type, fallback } = ctx.input;

    if (action === 'create') {
      if (!label) throw new Error('Label is required for create action.');
      if (!type) throw new Error('Type is required for create action.');
      let field = await client.createField(listId, { label, tag, type, fallback });
      return {
        output: { field },
        message: `Created custom field **${field.label}** (\`${field.tag}\`, type: ${field.type}).`
      };
    }

    if (action === 'update') {
      let field = await client.updateField(listId, tag, { label, fallback });
      return {
        output: { field },
        message: `Updated custom field **${field.label}** (\`${field.tag}\`).`
      };
    }

    if (action === 'delete') {
      await client.deleteField(listId, tag);
      return {
        output: { deleted: true },
        message: `Deleted custom field \`${tag}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
