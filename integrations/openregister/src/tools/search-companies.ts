import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpenRegisterClient } from '../lib/client';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const searchCompanies = SlateTool.create(spec, {
  key: 'search_companies',
  name: 'Search Companies',
  description:
    'Find German companies by name using inexpensive autocomplete. Returns company_id values for company research tools. For geographic, financial, register, or other structured filters use search_companies_advanced.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Company name to autocomplete. Use search_companies_advanced for filters and pagination.'
        )
    })
  )
  .output(out.companySearchOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'search companies',
      '/v1/autocomplete/company',
      out.companySearchOutput,
      { params: ctx.input }
    );
    return { output: result, message: 'Search companies completed.' };
  })
  .build();
