import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageForm = SlateTool.create(spec, {
  name: 'Manage Form',
  key: 'manage_form',
  description: `Create, update, or delete forms that AI agents use to collect structured data from users during conversations. Forms can be connected to webhooks for pushing captured data to external systems.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      formId: z.string().optional().describe('Form ID (required for update/delete)'),
      name: z.string().optional().describe('Form name'),
      description: z.string().optional().describe('Form description'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            type: z.string().optional().describe('Field type'),
            required: z.boolean().optional().describe('Whether the field is required'),
            description: z.string().optional().describe('Field description for the AI agent')
          })
        )
        .optional()
        .describe('Form fields definition'),
      webhookId: z.string().optional().describe('Webhook ID for form submission notifications')
    })
  )
  .output(
    z.object({
      formId: z.string().optional(),
      name: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createForm({
        name: ctx.input.name,
        description: ctx.input.description,
        fields: ctx.input.fields,
        webhook_id: ctx.input.webhookId
      });
      let data = result.data || result;
      return {
        output: {
          formId: data.id,
          name: data.name
        },
        message: `Created form **${data.name || data.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateForm(ctx.input.formId!, {
        name: ctx.input.name,
        description: ctx.input.description,
        fields: ctx.input.fields,
        webhook_id: ctx.input.webhookId
      });
      let data = result.data || result;
      return {
        output: {
          formId: data.id,
          name: data.name
        },
        message: `Updated form **${data.name || ctx.input.formId}**.`
      };
    }

    // delete
    await client.deleteForm(ctx.input.formId!);
    return {
      output: {
        formId: ctx.input.formId,
        deleted: true
      },
      message: `Deleted form \`${ctx.input.formId}\`.`
    };
  })
  .build();
