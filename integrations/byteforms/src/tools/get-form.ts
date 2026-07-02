import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFormTool = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve detailed information about a specific ByteForms form by its ID. Returns the full form definition including all field configurations, form options, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The ID of the form to retrieve')
    })
  )
  .output(
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
          password: z.string().optional(),
          theme: z.string().optional(),
          visibility: z.string().optional(),
          pageBehaviour: z.string().optional(),
          customCode: z.string().optional(),
          draftSubmissions: z.boolean().optional(),
          removeBranding: z.boolean().optional(),
          emailNotifications: z.boolean().optional()
        })
        .describe('Form configuration options'),
      createdAt: z.string().describe('ISO timestamp when the form was created'),
      updatedAt: z.string().describe('ISO timestamp when the form was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getForm(ctx.input.formId);
    let form = result.data;

    return {
      output: {
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
          password: form.options?.password,
          theme: form.options?.theme,
          visibility: form.options?.visibility,
          pageBehaviour: form.options?.page_behaviour,
          customCode: form.options?.custom_code,
          draftSubmissions: form.options?.draft_submissions,
          removeBranding: form.options?.remove_branding,
          emailNotifications: form.options?.email_notifications
        },
        createdAt: form.created_at,
        updatedAt: form.updated_at
      },
      message: `Retrieved form **"${form.name}"** (ID: ${form.id}).`
    };
  })
  .build();
