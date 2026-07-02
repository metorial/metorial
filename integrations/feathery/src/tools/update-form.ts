import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let updateForm = SlateTool.create(spec, {
  name: 'Update Form',
  key: 'update_form',
  description: `Update an existing form's properties. Can enable/disable the form, rename it, configure translations, and update integrations (including webhook settings).`
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to update'),
      enabled: z.boolean().optional().describe('Enable or disable the form'),
      formName: z.string().optional().describe('New name for the form'),
      translations: z
        .any()
        .optional()
        .describe('Translation configuration for internationalization'),
      integrations: z
        .array(z.any())
        .optional()
        .describe('Integration configurations (webhooks, etc.)')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the updated form'),
      formName: z.string().optional().describe('Updated name of the form'),
      enabled: z.boolean().optional().describe('Current enabled state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let form = await client.updateForm(ctx.input.formId, {
      enabled: ctx.input.enabled,
      formName: ctx.input.formName,
      translations: ctx.input.translations,
      integrations: ctx.input.integrations
    });

    return {
      output: {
        formId: form.id || form.form_id || ctx.input.formId,
        formName: form.name || form.form_name,
        enabled: form.enabled
      },
      message: `Updated form **${form.name || form.form_name || ctx.input.formId}**.`
    };
  })
  .build();
