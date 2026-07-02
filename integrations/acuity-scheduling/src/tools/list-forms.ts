import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Intake Forms',
  key: 'list_forms',
  description: `Retrieve all intake form definitions configured for the account. Forms are associated with appointment types and collect custom information from clients during booking. Use field IDs when creating or updating appointments with custom field values.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.number().describe('Form ID'),
            name: z.string().describe('Form name'),
            fields: z
              .array(
                z.object({
                  fieldId: z.number().describe('Field ID'),
                  name: z.string().describe('Field name'),
                  type: z.string().describe('Field type (e.g. textbox, dropdown)'),
                  required: z.boolean().optional().describe('Whether the field is required'),
                  options: z
                    .array(z.string())
                    .optional()
                    .describe('Available options for select/dropdown fields')
                })
              )
              .describe('Form fields')
          })
        )
        .describe('List of intake forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.listForms();

    let forms = (results as any[]).map((f: any) => ({
      formId: f.id,
      name: f.name || '',
      fields: ((f.fields as any[]) || []).map((field: any) => ({
        fieldId: field.id,
        name: field.name || '',
        type: field.type || '',
        required: field.required || undefined,
        options: field.options || undefined
      }))
    }));

    return {
      output: { forms },
      message: `Found **${forms.length}** intake form(s).`
    };
  })
  .build();
