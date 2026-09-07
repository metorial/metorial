import { createApiServiceError, SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getCompanyOwners = SlateTool.create(spec, {
  key: 'get_company_owners',
  name: 'Get Company Owners',
  description:
    'Find who directly owns a company, ownership percentages, and supporting sources. For AG/SE, set best_available=true to request potentially historical data; otherwise the provider returns 404. Cannot combine best_available with realtime. Discover company_id with search_companies.',
  tags: { readOnly: true }
})
  .input(inputs.ownersInput)
  .output(out.ownersOutput)
  .handleInvocation(async ctx => {
    if (ctx.input.realtime && ctx.input.best_available)
      throw createApiServiceError('realtime and best_available cannot both be true.');
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get company owners',
      `/v1/company/${encodeURIComponent(ctx.input.company_id)}/owners`,
      out.ownersOutput,
      {
        params: {
          realtime: ctx.input.realtime,
          export: ctx.input.export,
          best_available: ctx.input.best_available
        }
      }
    );
    return { output: result, message: 'Get company owners completed.' };
  })
  .build();
