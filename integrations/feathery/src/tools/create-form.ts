import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let createForm = SlateTool.create(spec, {
  name: 'Create Form',
  key: 'create_form',
  description: `Create a new form in Feathery. You can create from scratch or use a template form as a starting point. Supports defining steps, fields, navigation rules, and logic rules.`
})
  .input(
    z.object({
      formName: z.string().describe('Name for the new form'),
      templateFormId: z.string().optional().describe('ID of a template form to create from'),
      steps: z
        .array(z.any())
        .optional()
        .describe('Array of step definitions with fields, text elements, buttons, and images'),
      navigationRules: z
        .array(z.any())
        .optional()
        .describe('Navigation rules controlling step flow'),
      logicRules: z.array(z.any()).optional().describe('Logic rules for conditional behavior')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the newly created form'),
      formName: z.string().describe('Name of the created form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let form = await client.createForm({
      formName: ctx.input.formName,
      templateFormId: ctx.input.templateFormId,
      steps: ctx.input.steps,
      navigationRules: ctx.input.navigationRules,
      logicRules: ctx.input.logicRules
    });

    return {
      output: {
        formId: form.id || form.form_id,
        formName: form.name || form.form_name || ctx.input.formName
      },
      message: `Created form **${ctx.input.formName}**${ctx.input.templateFormId ? ' from template' : ''}.`
    };
  })
  .build();
