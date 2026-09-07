import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const searchCompaniesAdvanced = SlateTool.create(spec, {
  key: 'search_companies_advanced',
  name: 'Search Companies Advanced',
  description:
    'Search German companies by name, register identifiers, location, industry, ownership characteristics, and financial ranges. Monetary filters use cents. Returns one page with company_id values and pagination.',
  tags: { readOnly: true }
})
  .input(inputs.advancedCompanyInput)
  .output(out.advancedCompanyOutput)
  .handleInvocation(async ctx => {
    inputs.validateFilters(ctx.input.filters);
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'search companies advanced',
      '/v1/search/company',
      out.advancedCompanyOutput,
      { method: 'POST', body: ctx.input }
    );
    return { output: result, message: 'Search companies advanced completed.' };
  })
  .build();
