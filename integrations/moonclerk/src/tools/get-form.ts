import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getFormTool = SlateTool.create(spec, {
  name: 'Get Payment Form',
  key: 'get_form',
  description: `Retrieve a specific MoonClerk payment form by its ID. Returns the form's title, currency, payment volume, and successful checkout count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.number().describe('MoonClerk form ID')
    })
  )
  .output(formSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let form = await client.getForm(ctx.input.formId);

    return {
      output: form,
      message: `Retrieved form **"${form.title}"** (ID: ${form.formId}).`
    };
  })
  .build();
