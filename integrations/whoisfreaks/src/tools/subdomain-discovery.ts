import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let subdomainDiscovery = SlateTool.create(spec, {
  name: 'Subdomain Discovery',
  key: 'subdomain_discovery',
  description: `Retrieve one page of known subdomains for a given domain, with first-seen, last-seen, and active/inactive status metadata. Filter by observation dates or status when investigating an attack surface.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domainName: z
        .string()
        .describe('Domain name to discover subdomains for (e.g. "example.com")'),
      page: z
        .number()
        .refine(Number.isSafeInteger, 'Page number must be a safe integer.')
        .min(1)
        .optional()
        .describe('Page number for paginated results'),
      after: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Only records created after this date (YYYY-MM-DD)'),
      before: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Only records created before this date (YYYY-MM-DD)'),
      status: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Subdomain status; omit for both')
    })
  )
  .output(
    z.object({
      subdomains: z.any().describe('List of discovered subdomains with metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let result = await client.subdomainLookup(ctx.input.domainName, ctx.input.page, {
      after: ctx.input.after,
      before: ctx.input.before,
      status: ctx.input.status
    });

    return {
      output: { subdomains: result },
      message: `Discovered subdomains for **${ctx.input.domainName}**.`
    };
  })
  .build();
