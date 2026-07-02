import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listFormsTool = SlateTool.create(spec, {
  name: 'List Payment Forms',
  key: 'list_forms',
  description: `Retrieve all MoonClerk payment forms. Returns each form's title, currency, payment volume, and checkout count. Use this to discover available forms and their IDs for filtering payments or customers.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      forms: z.array(formSchema).describe('List of payment forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let forms = await client.listForms();

    return {
      output: { forms },
      message: `Retrieved **${forms.length}** payment form(s).`
    };
  })
  .build();
