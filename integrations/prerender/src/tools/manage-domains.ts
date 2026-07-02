import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrerenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageDomains = SlateTool.create(spec, {
  name: 'Manage Domains',
  key: 'manage_domains',
  description: `View and manage connected domains in Prerender. List all domains with cache statistics, view or update domain-specific configuration such as cache lifetime, or get aggregate domain statistics.`,
  instructions: [
    'Use action `list` to see all connected domains and their cache stats.',
    "Use action `get_config` to view a specific domain's cache configuration.",
    "Use action `update_config` to modify a domain's settings like cache lifetime.",
    'Use action `statistics` to get aggregate statistics across all domains.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get_config', 'update_config', 'statistics'])
        .describe('The operation to perform.'),
      domain: z
        .string()
        .optional()
        .describe(
          'The domain name (e.g. "example.com"). Required for `get_config` and `update_config`.'
        ),
      query: z.string().optional().describe('Search filter when listing domains.'),
      cacheLifetime: z
        .number()
        .optional()
        .describe('Cache lifetime in seconds for the domain. Used in `update_config`.'),
      configUpdates: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional domain configuration fields to update. Used in `update_config`.')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Response from the Prerender domains API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrerenderClient({ token: ctx.auth.token });
    let result: unknown;
    let actionDescription: string;

    switch (ctx.input.action) {
      case 'list': {
        result = await client.listDomains(ctx.input.query);
        actionDescription = 'Listed domains';
        break;
      }
      case 'get_config': {
        if (!ctx.input.domain) {
          throw new Error('domain is required for the get_config action.');
        }
        result = await client.getDomainConfig(ctx.input.domain);
        actionDescription = `Retrieved config for domain **${ctx.input.domain}**`;
        break;
      }
      case 'update_config': {
        if (!ctx.input.domain) {
          throw new Error('domain is required for the update_config action.');
        }
        let updates: Record<string, unknown> = { ...ctx.input.configUpdates };
        if (ctx.input.cacheLifetime !== undefined) {
          updates.cacheLifetime = ctx.input.cacheLifetime;
        }
        result = await client.updateDomainConfig(ctx.input.domain, updates);
        actionDescription = `Updated config for domain **${ctx.input.domain}**`;
        break;
      }
      case 'statistics': {
        result = await client.getDomainStatistics();
        actionDescription = 'Retrieved domain statistics';
        break;
      }
    }

    return {
      output: {
        result
      },
      message: `${actionDescription!}.`
    };
  })
  .build();
