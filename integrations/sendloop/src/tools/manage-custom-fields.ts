import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `List, create, or delete custom fields on a subscriber list. Custom fields store additional attributes alongside subscriber email addresses and can be used for personalization and targeting.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      listId: z.string().describe('ID of the subscriber list'),
      customFieldId: z.string().optional().describe('Custom field ID (required for delete)'),
      fieldName: z
        .string()
        .optional()
        .describe('Name of the custom field (required for create)'),
      fieldType: z
        .string()
        .optional()
        .describe('Type of the custom field (e.g., "text", "number", "date")')
    })
  )
  .output(
    z.object({
      customFields: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of custom field objects (for list action)'),
      customFieldId: z
        .string()
        .optional()
        .describe('ID of the created or deleted custom field'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, listId, customFieldId, fieldName, fieldType } = ctx.input;

    if (action === 'list') {
      let result = await client.getCustomFields(listId);
      let fields = result.CustomFields || result.Data || [];
      if (!Array.isArray(fields)) fields = [fields];

      return {
        output: { customFields: fields, success: true },
        message: `Retrieved **${fields.length}** custom field(s) for list **${listId}**.`
      };
    }

    if (action === 'create') {
      if (!fieldName) throw new Error('Field name is required for create action');
      let result = await client.createCustomField(listId, { fieldName, fieldType });

      return {
        output: {
          customFieldId: String(result.CustomFieldID || result.CustomFieldId || ''),
          success: true
        },
        message: `Successfully created custom field **${fieldName}** on list **${listId}**.`
      };
    }

    if (action === 'delete') {
      if (!customFieldId) throw new Error('Custom field ID is required for delete action');
      await client.deleteCustomField(listId, customFieldId);

      return {
        output: { customFieldId, success: true },
        message: `Successfully deleted custom field **${customFieldId}** from list **${listId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
