import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

export let getApiQuotaTool = SlateTool.create(spec, {
  name: 'Get API Quota',
  key: 'get_api_quota',
  description:
    'Check the authenticated Moz account ID, allotted and consumed API rows, quota reset times, and whether overage is enabled.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      path: z
        .enum(['api.limits.data.rows', 'api.limits.mozscape.rows', 'api.limits.beta.rows'])
        .optional()
        .describe('Quota to inspect (default: api.limits.data.rows)')
    })
  )
  .output(
    z.object({
      quota: z
        .object({
          path: z.string(),
          accountId: z.number().optional(),
          allotted: z.number().optional(),
          used: z.number().optional(),
          reset: z.string().optional(),
          report: z.string().optional(),
          overage: z.boolean().optional(),
          periodStart: z.number().optional().describe('Quota period start as Unix seconds'),
          periodReset: z.number().optional().describe('Quota reset as Unix seconds')
        })
        .passthrough()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new MozClient({ token: ctx.auth.token }).getQuota(ctx.input.path);
    if (!result.quota || typeof result.quota.path !== 'string') {
      throw createApiServiceError('Moz returned no quota information.');
    }
    let quota = result.quota;
    return {
      output: {
        quota: {
          ...quota,
          accountId: quota.account_id,
          periodStart: quota.period_start ?? undefined,
          periodReset: quota.period_reset ?? undefined
        }
      },
      message: `API quota: ${quota.used ?? 'N/A'} of ${quota.allotted ?? 'N/A'} rows used.`
    };
  })
  .build();
