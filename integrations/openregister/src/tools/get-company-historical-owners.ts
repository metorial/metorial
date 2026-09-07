import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getCompanyHistoricalOwners = SlateTool.create(spec, {
  key: 'get_company_historical_owners',
  name: 'Get Company Historical Owners',
  description:
    'Trace past and present owners with dated ownership changes and supporting document IDs. Discover company_id with search_companies; use get_stored_document for returned document IDs.',
  tags: { readOnly: true }
})
  .input(inputs.companyInput)
  .output(out.historicalOwnersOutput.extend({ company_id: inputs.companyId }))
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get company historical owners',
      `/v1/company/${encodeURIComponent(ctx.input.company_id)}/owners/historical`,
      out.historicalOwnersOutput,
      {}
    );
    return {
      output: { ...result, company_id: ctx.input.company_id },
      message: 'Get company historical owners completed.'
    };
  })
  .build();
