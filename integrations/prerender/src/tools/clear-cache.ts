import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let clearCache = SlateTool.create(spec, {
  name: 'Clear Cache',
  key: 'clear_cache',
  description: `Clear cached URLs from Prerender using a wildcard query pattern. Use \`%\` and \`?\` as SQL-like wildcards — for example, \`https://example.com%\` clears all cached URLs starting with that prefix. The clear job is scheduled asynchronously. You can optionally check the job status.`,
  instructions: [
    'Append `%` after a URL prefix to delete everything beginning with that string.',
    '`?` matches a single character. `%` matches any number of characters.',
    'Only one clear cache job can be scheduled at a time per account.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Wildcard pattern for URLs to clear. Use `%` for multi-character and `?` for single-character wildcards.'
        ),
      checkStatus: z
        .boolean()
        .optional()
        .describe('If true, also checks the current clear cache job status after scheduling.')
    })
  )
  .output(
    z.object({
      clearResponse: z
        .record(z.string(), z.unknown())
        .describe('Response from the clear cache request.'),
      jobStatus: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Current status of the clear cache job, if status check was requested.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });

    let clearResponse = await client.clearCache({ query: ctx.input.query });

    let jobStatus: Record<string, unknown> | undefined;
    if (ctx.input.checkStatus) {
      try {
        let statusResponse = await client.getClearCacheStatus();
        jobStatus = statusResponse as Record<string, unknown>;
      } catch {
        jobStatus = { status: 'unable_to_fetch' };
      }
    }

    return {
      output: {
        clearResponse: clearResponse as Record<string, unknown>,
        jobStatus
      },
      message: `Scheduled cache clear for pattern **"${ctx.input.query}"**.${jobStatus ? ` Job status: ${JSON.stringify(jobStatus)}` : ''}`
    };
  })
  .build();
