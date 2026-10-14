import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitForm = SlateTool.create(spec, {
  name: 'Submit Form',
  key: 'submit_form',
  description:
    'Sends a new submission to a Formcarry form using named text fields. This can trigger the form’s configured email notifications, webhooks, and integrations.',
  constraints: [
    'File uploads are not supported by this tool.',
    'The form’s validation and spam protection rules apply. Include any required fields or reCAPTCHA response in fields.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      formId: z
        .string()
        .min(1)
        .describe(
          'The form ID from create_form, or the segment after /s/ in its endpoint URL'
        ),
      fields: z
        .record(z.string().min(1), z.string())
        .refine(fields => Object.keys(fields).length > 0, 'Provide at least one named field.')
        .describe('Form field names and their text values, such as name, email, and message')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('The form that received the submission'),
      status: z.literal('success').describe('Submission acceptance status'),
      statusMessage: z.string().describe('Status message from Formcarry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.submitForm(ctx.input.formId, ctx.input.fields);

    return {
      output: {
        formId: ctx.input.formId,
        status: result.status,
        statusMessage: result.message
      },
      message: `Submitted form **${ctx.input.formId}**. ${result.message}`
    };
  });
