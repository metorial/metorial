import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFormsTool = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Retrieve all forms associated with your ByteForms account. Returns form metadata including name, configuration options, field definitions, and timestamps. Useful for discovering available forms before fetching their submissions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.number().describe('Unique numeric identifier of the form'),
          publicId: z.string().describe('Public identifier used for sharing the form'),
          name: z.string().describe('Name of the form'),
          isCustom: z.boolean().describe('Whether the form uses a custom template'),
          fields: z.array(z.any()).describe('Form field definitions'),
          options: z
            .object({
              oneSubmissionPerEmail: z.boolean().optional(),
              thankYouMessage: z.string().optional(),
              maxSubmissions: z.number().optional(),
              submitButtonText: z.string().optional(),
              formWidth: z.string().optional(),
              redirectUrl: z.string().optional(),
              theme: z.string().optional(),
              visibility: z.string().optional(),
              emailNotifications: z.boolean().optional()
            })
            .describe('Form configuration options'),
          createdAt: z.string().describe('ISO timestamp when the form was created'),
          updatedAt: z.string().describe('ISO timestamp when the form was last updated')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listForms();

    let forms = result.data.map(form => ({
      formId: form.id,
      publicId: form.public_id,
      name: form.name,
      isCustom: form.is_custom,
      fields: form.body,
      options: {
        oneSubmissionPerEmail: form.options?.one_submission_per_email,
        thankYouMessage: form.options?.thank_you_message,
        maxSubmissions: form.options?.max_submissions,
        submitButtonText: form.options?.submit_button_text,
        formWidth: form.options?.form_width,
        redirectUrl: form.options?.redirect_url,
        theme: form.options?.theme,
        visibility: form.options?.visibility,
        emailNotifications: form.options?.email_notifications
      },
      createdAt: form.created_at,
      updatedAt: form.updated_at
    }));

    return {
      output: { forms },
      message: `Retrieved **${forms.length}** form(s) from your ByteForms account.`
    };
  })
  .build();
