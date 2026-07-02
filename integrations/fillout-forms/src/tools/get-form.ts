import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formMetadataSchema } from '../lib/types';
import { spec } from '../spec';

export let getForm = SlateTool.create(spec, {
  name: 'Get Form',
  key: 'get_form',
  description: `Retrieve detailed metadata for a specific form, including all question definitions, calculations, URL parameters, scheduling fields, payment fields, and quiz configuration. Use this to understand a form's structure before working with its submissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('Public identifier of the form (found in the form URL)')
    })
  )
  .output(formMetadataSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
    });

    let form = await client.getForm(ctx.input.formId);

    return {
      output: form,
      message: `Retrieved form **${form.name}** with **${form.questions?.length ?? 0}** question(s).`
    };
  })
  .build();
