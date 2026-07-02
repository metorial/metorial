import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Retrieves all forms available in the Formdesk account. Returns form identifiers and names that can be used with other tools to query submissions, export data, or manage results.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.string().describe('Unique identifier of the form'),
          formName: z.string().describe('Display name of the form')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Fetching forms...');
    let forms = await client.getForms();

    let mapped = forms.map((f: any) => ({
      formId: String(f.id || f.name || ''),
      formName: String(f.name || f.title || f.id || '')
    }));

    return {
      output: { forms: mapped },
      message: `Found **${mapped.length}** form(s).`
    };
  })
  .build();
