import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getCompany = SlateTool.create(spec, {
  key: 'get_company',
  name: 'Get Company',
  description:
    'Read a German company profile, current and historical names, addresses, representatives, document IDs, sources, and financial indicators. Discover company_id with search_companies. Cached by default; realtime=true costs additional credits.',
  tags: { readOnly: true }
})
  .input(inputs.companyDetailsInput)
  .output(out.companyOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get company',
      `/v1/company/${encodeURIComponent(ctx.input.company_id)}`,
      out.companyOutput,
      { params: { realtime: ctx.input.realtime, export: ctx.input.export } }
    );
    return { output: result, message: 'Get company completed.' };
  })
  .build();
