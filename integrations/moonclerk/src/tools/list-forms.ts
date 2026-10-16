import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listFormsTool = SlateTool.create(spec, {
  name: 'List Payment Forms',
  key: 'list_forms',
  description: `Retrieve a page of MoonClerk payment forms. Returns each form's title, currency, payment volume, and checkout count. Use this to discover available forms and their IDs for filtering payments or customers.`,
  instructions: [
    'By default returns 10 results. Use count (1-100) and offset for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      count: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results to return (1-100, default 10)'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      forms: z.array(formSchema).describe('List of payment forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let forms = await client.listForms(ctx.input);

    return {
      output: { forms },
      message: `Retrieved **${forms.length}** payment form(s).`
    };
  })
  .build();
