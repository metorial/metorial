import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let copyForm = SlateTool.create(spec, {
  name: 'Copy Form',
  key: 'copy_form',
  description: `Create a copy of an existing form with a new name. Duplicates the form's steps, fields, rules, and configuration.`
})
  .input(
    z.object({
      copyFormId: z.string().describe('ID of the form to copy'),
      formName: z.string().describe('Name for the new copy')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the newly copied form'),
      formName: z.string().describe('Name of the copied form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let form = await client.copyForm({
      formName: ctx.input.formName,
      copyFormId: ctx.input.copyFormId
    });

    return {
      output: {
        formId: form.id || form.form_id,
        formName: form.name || form.form_name || ctx.input.formName
      },
      message: `Copied form to **${ctx.input.formName}**.`
    };
  })
  .build();
