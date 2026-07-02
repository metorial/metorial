import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { spec } from '../spec';

export let getPublishingLimitTool = SlateTool.create(spec, {
  name: 'Get Publishing Limit',
  key: 'get_publishing_limit',
  description:
    "Retrieve the authenticated Instagram professional account's current API content publishing quota usage for the rolling publishing window.",
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('Instagram user ID. Defaults to the authenticated user.'),
      since: z
        .string()
        .optional()
        .describe(
          'Optional Unix timestamp or strtotime-compatible start time for quota usage.'
        )
    })
  )
  .output(
    z.object({
      quotaUsage: z.number().optional().describe('Number of API-published posts used.'),
      quotaTotal: z.number().optional().describe('Total posts allowed in the quota window.'),
      quotaDurationSeconds: z
        .number()
        .optional()
        .describe('Duration of the quota window in seconds.'),
      raw: z.any().optional().describe('Raw API response item for fields not mapped yet.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let effectiveUserId = ctx.input.userId || ctx.auth.userId || 'me';
    let result = await client.getContentPublishingLimit(effectiveUserId, ctx.input.since);
    let item = result.data?.[0] ?? result;

    return {
      output: {
        quotaUsage: item.quota_usage,
        quotaTotal: item.config?.quota_total,
        quotaDurationSeconds: item.config?.quota_duration,
        raw: item
      },
      message:
        item.config?.quota_total !== undefined && item.quota_usage !== undefined
          ? `Instagram publishing quota usage is **${item.quota_usage}/${item.config.quota_total}** for this window.`
          : 'Retrieved Instagram publishing quota usage.'
    };
  })
  .build();
