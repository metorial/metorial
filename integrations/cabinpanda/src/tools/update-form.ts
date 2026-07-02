import { SlateTool } from 'slates';
import { z } from 'zod';
import { CabinPandaClient } from '../lib/client';
import { spec } from '../spec';

export let updateForm = SlateTool.create(spec, {
  name: 'Update Form',
  key: 'update_form',
  description: `Update an existing form's configuration. Allows modifying the form name, fields, settings, template, receivers, submit button label, success message, and error display behavior.`
})
  .input(
    z.object({
      formId: z.string().describe('The 32-character alphanumeric key of the form to update'),
      name: z.string().optional().describe('New name for the form'),
      typeId: z.string().optional().describe('New type identifier for the form'),
      templateId: z.string().optional().describe('New template ID for the form layout'),
      fields: z.array(z.any()).optional().describe('Updated array of field definitions'),
      settings: z.record(z.string(), z.any()).optional().describe('Updated form settings'),
      receivers: z
        .array(z.string())
        .optional()
        .describe('Email addresses to receive form submissions'),
      showErrors: z
        .boolean()
        .optional()
        .describe('Whether to display validation errors on the form'),
      successMessage: z
        .string()
        .optional()
        .describe('Message shown after successful submission'),
      submitButtonLabel: z.string().optional().describe('Label text for the submit button')
    })
  )
  .output(
    z.object({
      formId: z.string().optional().describe('Unique identifier (key) of the updated form'),
      name: z.string().optional().describe('Name of the updated form'),
      raw: z.any().optional().describe('Full updated form object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CabinPandaClient({ token: ctx.auth.token });
    let form = await client.updateForm(ctx.input.formId, {
      name: ctx.input.name,
      typeId: ctx.input.typeId,
      templateId: ctx.input.templateId,
      fields: ctx.input.fields,
      settings: ctx.input.settings,
      receivers: ctx.input.receivers,
      showErrors: ctx.input.showErrors,
      successMessage: ctx.input.successMessage,
      submitButtonLabel: ctx.input.submitButtonLabel
    });

    return {
      output: {
        formId: form?.key ?? form?.id?.toString(),
        name: form?.name,
        raw: form
      },
      message: `Updated form **${form?.name ?? ctx.input.formId}**.`
    };
  })
  .build();
