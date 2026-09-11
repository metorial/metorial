import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getCompanyHoldings = SlateTool.create(spec, {
  key: 'get_company_holdings',
  name: 'Get Company Holdings',
  description:
    'Find companies in which this company holds shares, including stake percentages and relationship dates. For who owns this company use get_company_owners. Discover company_id with search_companies.',
  tags: { readOnly: true }
})
  .input(inputs.companyInput)
  .output(out.companyHoldingsOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get company holdings',
      `/v1/company/${encodeURIComponent(ctx.input.company_id)}/holdings`,
      out.companyHoldingsOutput,
      {}
    );
    return { output: result, message: 'Get company holdings completed.' };
  })
  .build();
