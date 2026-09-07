import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenRegisterClient } from '../lib/client';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const lookupCompanyByUrl = SlateTool.create(spec, {
  key: 'lookup_company_by_url',
  name: 'Lookup Company By Url',
  description:
    'Resolve a company website URL to a German company_id and available contact details. Use the ID with get_company and ownership tools.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.url().describe('Company website URL, for example https://openregister.de.')
    })
  )
  .output(out.lookupOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'lookup company by url',
      '/v0/search/lookup',
      out.lookupOutput,
      { params: ctx.input }
    );
    return { output: result, message: 'Lookup company by url completed.' };
  })
  .build();
