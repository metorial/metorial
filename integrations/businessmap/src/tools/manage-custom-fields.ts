import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomFieldsTool = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `List or update custom field values on a card. Use action "list" to see all custom fields and their current values, or "update" to set a new value for a specific field.`
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the card'),
      action: z
        .enum(['list', 'update'])
        .describe('"list" to view all custom fields or "update" to set a field value'),
      fieldId: z.number().optional().describe('Custom field ID (required for update)'),
      value: z
        .any()
        .optional()
        .describe('New value for the custom field (required for update)')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Card ID'),
      customFields: z
        .array(
          z.object({
            fieldId: z.number().describe('Custom field ID'),
            name: z.string().optional().describe('Field name'),
            type: z.string().optional().describe('Field type'),
            value: z.any().optional().nullable().describe('Field value')
          })
        )
        .optional()
        .describe('Custom fields list (for list action)'),
      updatedField: z
        .object({
          fieldId: z.number().describe('Custom field ID'),
          value: z.any().optional().nullable().describe('Updated value')
        })
        .optional()
        .describe('Updated field (for update action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    if (ctx.input.action === 'list') {
      let fields = await client.listCustomFields(ctx.input.cardId);
      return {
        output: {
          cardId: ctx.input.cardId,
          customFields: (fields ?? []).map((f: any) => ({
            fieldId: f.field_id,
            name: f.name,
            type: f.type,
            value: f.value
          }))
        },
        message: `Card **${ctx.input.cardId}** has ${(fields ?? []).length} custom field(s).`
      };
    }

    // update
    if (!ctx.input.fieldId) throw new Error('fieldId is required to update a custom field.');
    let result = await client.updateCustomField(
      ctx.input.cardId,
      ctx.input.fieldId,
      ctx.input.value
    );
    return {
      output: {
        cardId: ctx.input.cardId,
        updatedField: {
          fieldId: ctx.input.fieldId,
          value: result?.value ?? ctx.input.value
        }
      },
      message: `Updated custom field **${ctx.input.fieldId}** on card **${ctx.input.cardId}**.`
    };
  })
  .build();
