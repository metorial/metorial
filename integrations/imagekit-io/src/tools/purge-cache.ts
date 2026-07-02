import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let purgeCache = SlateTool.create(spec, {
  name: 'Purge Cache',
  key: 'purge_cache',
  description: `Purge the CDN cache for a specific asset URL, or check the status of a pending purge request. Use this when you need to invalidate a cached version of an asset after updating it.`,
  constraints: [
    'Monthly limit of 1,000 URL cache purges per account (dashboard + API combined)'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['purge', 'status'])
        .describe(
          '"purge" to initiate a cache purge, "status" to check a purge request status'
        ),
      url: z
        .string()
        .optional()
        .describe('Full ImageKit URL to purge (required for purge operation)'),
      purgeRequestId: z
        .string()
        .optional()
        .describe('Purge request ID to check status (required for status operation)')
    })
  )
  .output(
    z.object({
      purgeRequestId: z
        .string()
        .optional()
        .describe('ID of the purge request (for purge operation)'),
      status: z
        .string()
        .optional()
        .describe('Purge status: "Pending" or "Complete" (for status operation)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.operation === 'purge') {
      if (!ctx.input.url) throw new Error('url is required for purge operation');
      let result = await client.purgeCache(ctx.input.url);

      return {
        output: { purgeRequestId: result.requestId },
        message: `Cache purge initiated for \`${ctx.input.url}\`. Request ID: \`${result.requestId}\`.`
      };
    }

    if (ctx.input.operation === 'status') {
      if (!ctx.input.purgeRequestId)
        throw new Error('purgeRequestId is required for status operation');
      let result = await client.getPurgeCacheStatus(ctx.input.purgeRequestId);

      return {
        output: { status: result.status },
        message: `Purge request \`${ctx.input.purgeRequestId}\` status: **${result.status}**.`
      };
    }

    throw new Error(`Unknown operation: ${ctx.input.operation}`);
  })
  .build();
