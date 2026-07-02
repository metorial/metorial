import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let domainAvailability = SlateTool.create(spec, {
  name: 'Domain Availability',
  key: 'domain_availability',
  description: `Check whether a domain name is available for registration. Optionally get alternative domain name suggestions. Supports single domain checks with suggestions, or bulk checks for up to 100 domains at once.`,
  constraints: [
    'Bulk checks support up to 100 domains per request.',
    'Suggestion count is capped at 100.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('Single domain name to check availability for (e.g. "example.com")'),
      domainNames: z
        .array(z.string())
        .optional()
        .describe('Array of domain names for bulk availability check (max 100)'),
      suggest: z
        .boolean()
        .optional()
        .describe('Whether to return alternative domain suggestions (single domain only)'),
      suggestionCount: z
        .number()
        .optional()
        .describe('Number of suggestions to return (default 5, max 100)')
    })
  )
  .output(
    z.object({
      availability: z.any().describe('Domain availability status and optional suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });

    if (ctx.input.domainNames && ctx.input.domainNames.length > 0) {
      let result = await client.bulkDomainAvailability(ctx.input.domainNames);
      return {
        output: { availability: result },
        message: `Checked availability for **${ctx.input.domainNames.length}** domains.`
      };
    }

    if (ctx.input.domain) {
      let result = await client.checkDomainAvailability(ctx.input.domain, {
        suggest: ctx.input.suggest,
        count: ctx.input.suggestionCount
      });
      return {
        output: { availability: result },
        message: `Checked availability for **${ctx.input.domain}**.`
      };
    }

    throw new Error('Either domain or domainNames must be provided.');
  })
  .build();
