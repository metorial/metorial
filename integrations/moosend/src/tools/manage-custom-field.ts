import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

export let manageCustomField = SlateTool.create(spec, {
  name: 'Manage Custom Field',
  key: 'manage_custom_field',
  description: `Create, update, or delete custom fields on a mailing list. Custom fields store additional subscriber data such as demographics, preferences, or any extra information beyond name and email.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      mailingListId: z.string().describe('ID of the mailing list'),
      customFieldId: z
        .string()
        .optional()
        .describe('Custom field ID (required for update and delete)'),
      name: z.string().optional().describe('Custom field name (required for create)'),
      fieldType: z
        .enum(['Text', 'Decimal', 'DateTime', 'SingleSelectDropdown', 'Integer', 'CheckBox'])
        .optional()
        .describe('Data type of the custom field'),
      options: z.string().optional().describe('Comma-separated values for dropdown fields'),
      isRequired: z
        .boolean()
        .optional()
        .describe('Whether the field is required for subscribers')
    })
  )
  .output(
    z.object({
      customFieldId: z.string().optional().describe('ID of the custom field'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });
    let { action, mailingListId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for creating a custom field');
        let body: Record<string, unknown> = { Name: ctx.input.name };
        if (ctx.input.fieldType) body.CustomFieldType = ctx.input.fieldType;
        if (ctx.input.options) body.Options = ctx.input.options;
        if (ctx.input.isRequired !== undefined) body.IsRequired = String(ctx.input.isRequired);
        let result = await client.createCustomField(mailingListId, body);
        return {
          output: {
            customFieldId: String(result?.ID ?? result ?? ''),
            action,
            success: true
          },
          message: `Created custom field **${ctx.input.name}** on list ${mailingListId}.`
        };
      }
      case 'update': {
        if (!ctx.input.customFieldId)
          throw new Error('customFieldId is required for updating a custom field');
        let body: Record<string, unknown> = {};
        if (ctx.input.name) body.Name = ctx.input.name;
        if (ctx.input.fieldType) body.CustomFieldType = ctx.input.fieldType;
        if (ctx.input.options) body.Options = ctx.input.options;
        if (ctx.input.isRequired !== undefined) body.IsRequired = String(ctx.input.isRequired);
        await client.updateCustomField(mailingListId, ctx.input.customFieldId, body);
        return {
          output: {
            customFieldId: ctx.input.customFieldId,
            action,
            success: true
          },
          message: `Updated custom field **${ctx.input.customFieldId}** on list ${mailingListId}.`
        };
      }
      case 'delete': {
        if (!ctx.input.customFieldId)
          throw new Error('customFieldId is required for deleting a custom field');
        await client.deleteCustomField(mailingListId, ctx.input.customFieldId);
        return {
          output: {
            customFieldId: ctx.input.customFieldId,
            action,
            success: true
          },
          message: `Deleted custom field **${ctx.input.customFieldId}** from list ${mailingListId}.`
        };
      }
    }
  })
  .build();
