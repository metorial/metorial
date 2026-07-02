import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `Create, update, delete, and list custom fields for subscriber profiles. Custom fields store additional data like last name, phone number, or any other information. Each Kit account is limited to 140 custom fields.`,
  constraints: [
    'Maximum of 140 custom fields per account.',
    'Custom field values are stored as plain text.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      customFieldId: z
        .number()
        .optional()
        .describe('Custom field ID (required for update and delete)'),
      label: z
        .string()
        .optional()
        .describe('Custom field label (required for create and update)')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(
          z.object({
            customFieldId: z.number().describe('Unique custom field ID'),
            key: z.string().describe('Custom field key (auto-generated from label)'),
            label: z.string().describe('Custom field display label')
          })
        )
        .optional()
        .describe('List of custom fields (for list action)'),
      customField: z
        .object({
          customFieldId: z.number().describe('Unique custom field ID'),
          key: z.string().describe('Custom field key'),
          label: z.string().describe('Custom field display label')
        })
        .optional()
        .describe('Created or updated custom field'),
      deleted: z.boolean().optional().describe('Whether the custom field was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listCustomFields();
      let customFields = result.data.map(f => ({
        customFieldId: f.id,
        key: f.key,
        label: f.label
      }));
      return {
        output: { customFields },
        message: `Found **${customFields.length}** custom fields.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.label) throw new Error('Label is required for create');
      let data = await client.createCustomField(ctx.input.label);
      let f = data.custom_field;
      return {
        output: {
          customField: {
            customFieldId: f.id,
            key: f.key,
            label: f.label
          }
        },
        message: `Created custom field **${f.label}** (key: \`${f.key}\`).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.customFieldId) throw new Error('Custom field ID is required for update');
      if (!ctx.input.label) throw new Error('Label is required for update');
      let data = await client.updateCustomField(ctx.input.customFieldId, ctx.input.label);
      let f = data.custom_field;
      return {
        output: {
          customField: {
            customFieldId: f.id,
            key: f.key,
            label: f.label
          }
        },
        message: `Updated custom field to **${f.label}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.customFieldId) throw new Error('Custom field ID is required for delete');
      await client.deleteCustomField(ctx.input.customFieldId);
      return {
        output: { deleted: true },
        message: `Deleted custom field \`${ctx.input.customFieldId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
