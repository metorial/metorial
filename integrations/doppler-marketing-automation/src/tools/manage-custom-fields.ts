import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `Create, update, or delete custom fields for subscriber data. Custom fields allow storing additional subscriber attributes like names, birthdates, and other data used for personalization and segmentation.`,
  instructions: [
    'Supported field types: boolean, string, number, date, gender, country.',
    'Boolean values must be "true" or "false" (case-sensitive). Date format: yyyy-MM-dd. Gender: "M" or "F". Country: ISO 3166-1 alpha-2 code.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform'),
      fieldName: z
        .string()
        .describe(
          'Name of the custom field. Used to identify the field for update and delete actions.'
        ),
      fieldType: z
        .enum(['boolean', 'string', 'number', 'date', 'gender', 'country'])
        .optional()
        .describe('Type of the field. Required for create action.'),
      isPrivate: z.boolean().optional().describe('Whether the field should be private'),
      newName: z
        .string()
        .optional()
        .describe('New name for the field. Only used with update action.')
    })
  )
  .output(
    z.object({
      fieldName: z.string().describe('Name of the field'),
      action: z.string().describe('Action performed'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.fieldType) {
        throw new Error('fieldType is required when creating a custom field');
      }
      let result = await client.createField({
        name: ctx.input.fieldName,
        type: ctx.input.fieldType,
        private: ctx.input.isPrivate
      });
      return {
        output: {
          fieldName: ctx.input.fieldName,
          action: 'create',
          message: result.message
        },
        message: `Created custom field **${ctx.input.fieldName}** of type \`${ctx.input.fieldType}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      await client.updateField(ctx.input.fieldName, {
        name: ctx.input.newName,
        private: ctx.input.isPrivate
      });
      return {
        output: {
          fieldName: ctx.input.newName ?? ctx.input.fieldName,
          action: 'update',
          message: 'Field updated successfully'
        },
        message: `Updated custom field **${ctx.input.fieldName}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteField(ctx.input.fieldName);
      return {
        output: {
          fieldName: ctx.input.fieldName,
          action: 'delete',
          message: 'Field deleted successfully'
        },
        message: `Deleted custom field **${ctx.input.fieldName}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
