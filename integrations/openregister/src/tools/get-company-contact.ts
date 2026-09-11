import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getCompanyContact = SlateTool.create(spec, {
  key: 'get_company_contact',
  name: 'Get Company Contact',
  description:
    'Read company email, phone, VAT ID, and source website where indexed. Discover company_id with search_companies or lookup_company_by_url.',
  tags: { readOnly: true }
})
  .input(inputs.companyInput)
  .output(out.contactOutput.extend({ company_id: inputs.companyId }))
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get company contact',
      `/v0/company/${encodeURIComponent(ctx.input.company_id)}/contact`,
      out.contactOutput,
      {}
    );
    return {
      output: { ...result, company_id: ctx.input.company_id },
      message: 'Get company contact completed.'
    };
  })
  .build();
