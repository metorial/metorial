import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `List, create, update, or delete custom fields for storing additional subscriber data. Custom field values are set on individual subscribers when creating or updating them.`,
  instructions: [
    'Use action "list" to see all custom fields.',
    'Use action "create" to add a new custom field with a label.',
    'Use action "update" to rename a custom field. Note: renaming changes the field key and may break existing Liquid personalization tags.',
    'Use action "delete" to permanently remove a custom field and all its data from all subscribers.'
  ],
  constraints: [
    'Renaming a custom field changes its key, which may break existing Liquid personalization tags.',
    'Deleting a custom field removes all data in that field from all subscribers.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      fieldId: z.number().optional().describe('Custom field ID (required for update, delete)'),
      label: z.string().optional().describe('Field label (required for create, update)'),
      perPage: z.number().optional().describe('Results per page (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            fieldName: z.string().describe('Internal field name'),
            fieldKey: z.string().describe('Field key for use in Liquid tags'),
            fieldLabel: z.string().describe('Human-readable field label')
          })
        )
        .optional()
        .describe('List of custom fields (for list action)'),
      customField: z
        .object({
          fieldId: z.number().describe('Custom field ID'),
          fieldName: z.string().describe('Internal field name'),
          fieldKey: z.string().describe('Field key for use in Liquid tags'),
          fieldLabel: z.string().describe('Human-readable field label')
        })
        .optional()
        .describe('Single custom field (for create, update)'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listCustomFields({
        perPage: input.perPage,
        after: input.cursor
      });
      let customFields = result.customFields.map(f => ({
        fieldId: f.id,
        fieldName: f.name,
        fieldKey: f.key,
        fieldLabel: f.label
      }));
      return {
        output: {
          customFields,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${customFields.length}** custom field(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (input.action === 'create') {
      if (!input.label) throw new Error('label is required for create');
      let f = await client.createCustomField(input.label);
      return {
        output: {
          customField: {
            fieldId: f.id,
            fieldName: f.name,
            fieldKey: f.key,
            fieldLabel: f.label
          }
        },
        message: `Created custom field **${f.label}** (key: \`${f.key}\`)`
      };
    }

    if (input.action === 'update') {
      if (!input.fieldId) throw new Error('fieldId is required for update');
      if (!input.label) throw new Error('label is required for update');
      let f = await client.updateCustomField(input.fieldId, input.label);
      return {
        output: {
          customField: {
            fieldId: f.id,
            fieldName: f.name,
            fieldKey: f.key,
            fieldLabel: f.label
          }
        },
        message: `Updated custom field **${f.label}** (key: \`${f.key}\`)`
      };
    }

    if (input.action === 'delete') {
      if (!input.fieldId) throw new Error('fieldId is required for delete');
      await client.deleteCustomField(input.fieldId);
      return {
        output: {},
        message: `Deleted custom field #${input.fieldId}`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  });
