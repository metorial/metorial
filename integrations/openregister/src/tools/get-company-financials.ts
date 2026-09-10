import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getCompanyFinancials = SlateTool.create(spec, {
  key: 'get_company_financials',
  name: 'Get Company Financials',
  description:
    'Retrieve all available company financial statements, indicators, reporting periods, and source links. Monetary indicators are in cents; employees is a count. Reported and estimated figures retain separate provider fields. Discover company_id with search_companies.',
  tags: { readOnly: true }
})
  .input(inputs.companyInput)
  .output(out.financialsOutput.extend({ company_id: inputs.companyId }))
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get company financials',
      `/v1/company/${encodeURIComponent(ctx.input.company_id)}/financials`,
      out.financialsOutput,
      {}
    );
    return {
      output: { ...result, company_id: ctx.input.company_id },
      message: 'Get company financials completed.'
    };
  })
  .build();
