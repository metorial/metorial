import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let getClearCacheStatus = SlateTool.create(spec, {
  name: 'Get Clear Cache Status',
  key: 'get_clear_cache_status',
  description:
    'Check whether a previously scheduled cache-clear job is still in progress, without scheduling another clear operation.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.enum(['in_progress', 'not_queued']).describe('Current cache-clear job state.'),
      result: z.record(z.string(), z.unknown()).describe('Cache-clear status response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });
    let result = await client.getClearCacheStatus();
    let status: 'in_progress' | 'not_queued' =
      result.status === 'in_progress' ? 'in_progress' : 'not_queued';
    return {
      output: { status, result },
      message:
        status === 'in_progress'
          ? 'The cache-clear job is still in progress.'
          : 'No cache-clear job is currently queued.'
    };
  })
  .build();
