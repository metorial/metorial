import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export const discoverApi = SlateTool.create(spec, {
  name: 'Discover API',
  key: 'discover_api',
  description:
    'Read the native capability map filtered by this API key’s scopes, optionally including request schemas. This is not user identity, a server-version claim or proof that a licensed feature is enabled. Older deployments may not expose this route.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      include: z
        .enum(['schemas'])
        .optional()
        .describe('Include documented native request body schemas'),
      resource: z
        .string()
        .optional()
        .describe('Native resource filter such as workflow, tags or credential'),
      operation: z
        .string()
        .optional()
        .describe('Native operation filter such as read, list or create')
    })
  )
  .output(z.object({ capabilities: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => ({
    output: { capabilities: await clientFor(ctx).discover(ctx.input) },
    message:
      'Retrieved the native scoped capability map. Instance permissions and feature availability still apply.'
  }))
  .build();
