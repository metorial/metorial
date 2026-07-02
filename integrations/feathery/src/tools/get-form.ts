import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve the full details of a specific form including its steps, fields, navigation rules, logic rules, integrations, and translations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The unique identifier of the form to retrieve')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique form identifier'),
      formName: z.string().describe('Display name of the form'),
      enabled: z.boolean().optional().describe('Whether the form is active'),
      steps: z
        .array(z.any())
        .optional()
        .describe('Form steps with fields, text elements, buttons, images'),
      navigationRules: z
        .array(z.any())
        .optional()
        .describe('Rules controlling step navigation'),
      logicRules: z.array(z.any()).optional().describe('Logic rules for the form'),
      integrations: z
        .array(z.any())
        .optional()
        .describe('Configured integrations including webhooks'),
      translations: z.any().optional().describe('Internationalization translations'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let form = await client.getForm(ctx.input.formId);

    return {
      output: {
        formId: form.id || form.form_id,
        formName: form.name || form.form_name,
        enabled: form.enabled,
        steps: form.steps,
        navigationRules: form.navigation_rules,
        logicRules: form.logic_rules,
        integrations: form.integrations,
        translations: form.translations,
        tags: form.tags
      },
      message: `Retrieved form **${form.name || form.form_name}**.`
    };
  })
  .build();
