import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let getOrgLimits = SlateTool.create(spec, {
  name: 'Get Org Limits',
  key: 'get_org_limits',
  description: `Retrieve the current API usage limits and remaining allocations for the Salesforce org. Shows limits for daily API calls, data storage, file storage, and other governor limits.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      limits: z
        .record(z.string(), z.any())
        .describe('Map of limit names to their Max and Remaining values')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let limits = await client.getLimits();

    return {
      output: { limits },
      message: `Retrieved org limits — **${limits.DailyApiRequests?.Remaining ?? 'N/A'}** daily API requests remaining`
    };
  })
  .build();
