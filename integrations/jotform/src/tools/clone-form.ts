import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cloneFormTool = SlateTool.create(spec, {
  name: 'Clone Form',
  key: 'clone_form',
  description: `Create a duplicate of an existing JotForm form. The cloned form will have the same questions, properties, and settings as the original but will be a new independent form.`
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to clone')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the newly cloned form'),
      title: z.string().describe('Title of the cloned form'),
      url: z.string().describe('Public URL of the cloned form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let result = await client.cloneForm(ctx.input.formId);

    return {
      output: {
        formId: String(result.id),
        title: result.title || '',
        url: result.url || ''
      },
      message: `Cloned form ${ctx.input.formId} → new form **${result.title || 'Untitled'}** (ID: ${result.id}).`
    };
  })
  .build();
