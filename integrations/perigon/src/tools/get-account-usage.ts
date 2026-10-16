import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { limitsResponse } from '../lib/responses';
import { spec } from '../spec';

export let getAccountUsage = SlateTool.create(spec, {
  name: 'Get Account Usage',
  key: 'get_account_usage',
  description:
    'Identify the organization connected to this API key and retrieve account usage, request limits, page limits, and usage reset dates. This endpoint does not consume the monthly request quota.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(limitsResponse)
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);
    let result = await client.getAccountUsage();
    return {
      output: result,
      message: 'Retrieved the connected account and its current usage limits.'
    };
  })
  .build();
