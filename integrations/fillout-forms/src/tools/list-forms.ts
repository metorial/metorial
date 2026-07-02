import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formSummarySchema } from '../lib/types';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Retrieve all forms in your Fillout account. Returns a list of forms with their IDs and names, useful for discovering available forms before fetching detailed metadata or submissions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      forms: z.array(formSummarySchema).describe('List of forms in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl || ctx.config.baseUrl
    });

    let forms = await client.listForms();

    return {
      output: { forms },
      message: `Found **${forms.length}** form(s).`
    };
  })
  .build();
