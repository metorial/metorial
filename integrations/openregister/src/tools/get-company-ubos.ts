import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getCompanyUbos = SlateTool.create(spec, {
  key: 'get_company_ubos',
  name: 'Get Company Ubos',
  description:
    'Retrieve beneficial owners calculated by OpenRegister from company ownership data. This does not order an official Transparenzregister extract. Discover company_id with search_companies.',
  tags: { readOnly: true }
})
  .input(inputs.companyInput)
  .output(out.ubosOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get company ubos',
      `/v1/company/${encodeURIComponent(ctx.input.company_id)}/ubo`,
      out.ubosOutput,
      {}
    );
    return { output: result, message: 'Get company ubos completed.' };
  })
  .build();
