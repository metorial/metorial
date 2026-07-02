import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all forms in the church account. Optionally filter by active or archived status. Can also retrieve form field definitions for a specific form.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      isArchived: z
        .boolean()
        .optional()
        .describe(
          'Filter by archived status. True for archived forms, false for active forms, omit for all.'
        ),
      formId: z
        .string()
        .optional()
        .describe('If provided, also retrieves the field definitions for this specific form')
    })
  )
  .output(
    z.object({
      forms: z.array(z.any()).describe('Array of form objects'),
      fields: z
        .array(z.any())
        .optional()
        .describe('Form field definitions (when formId is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let forms = await client.listForms(ctx.input.isArchived);
    let formsArray = Array.isArray(forms) ? forms : [];

    let fields: unknown[] | undefined;
    if (ctx.input.formId) {
      let result = await client.listFormFields(ctx.input.formId);
      fields = Array.isArray(result) ? result : [];
    }

    return {
      output: { forms: formsArray, fields },
      message: `Found **${formsArray.length}** forms${fields ? ` (with ${fields.length} fields for form ID: ${ctx.input.formId})` : ''}.`
    };
  })
  .build();
