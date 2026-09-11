import { createApiServiceError, SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const searchInsolvencies = SlateTool.create(spec, {
  key: 'search_insolvencies',
  name: 'Search Insolvencies',
  description:
    'Search insolvency proceedings by debtor, court, case number, status, dates, or discovered company/person ID. Provide a query or at least one filter. Returns proceeding IDs and pagination for get_insolvency.',
  tags: { readOnly: true }
})
  .input(inputs.insolvencySearchInput)
  .output(out.insolvencySearchOutput)
  .handleInvocation(async ctx => {
    if (!ctx.input.query && !ctx.input.filters?.length) {
      throw createApiServiceError(
        'Provide a query or at least one filter to search insolvencies.',
        {
          reason: 'openregister_missing_search_criteria'
        }
      );
    }
    inputs.validateFilters(ctx.input.filters);
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'search insolvencies',
      '/v1/search/insolvency',
      out.insolvencySearchOutput,
      { method: 'POST', body: ctx.input }
    );
    return { output: result, message: 'Search insolvencies completed.' };
  })
  .build();
