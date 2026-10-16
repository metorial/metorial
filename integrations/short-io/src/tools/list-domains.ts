import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { domainIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List a page of domains registered in the Short.io account. Use limit and offset to paginate. Returns domain IDs, hostnames, and status for each domain. Useful for discovering available domains and their IDs for use with other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(300)
        .optional()
        .describe('Domains per page, from 1 to 300; provider default is 100.'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of domains to skip for pagination.'),
      pattern: z.string().optional().describe('Hostname search pattern.'),
      teamId: z.number().optional().describe('Filter domains by team ID.'),
      noTeamId: z.boolean().optional().describe('Filter domains without a team.')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainId: domainIdSchema,
            hostname: z.string().describe('The domain hostname.'),
            title: z.string().nullable().describe('Display title of the domain.'),
            state: z
              .string()
              .describe('Current state of the domain (e.g., "configured", "not_configured").'),
            createdAt: z.string().describe('Creation timestamp.'),
            teamId: z.number().nullable().describe('Team ID the domain belongs to.')
          })
        )
        .describe('Array of domains.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let domains = await client.listDomains(ctx.input);

    return {
      output: {
        domains: domains.map(d => ({
          domainId: d.id,
          hostname: d.hostname,
          title: d.title ?? null,
          state: d.state,
          createdAt: d.createdAt,
          teamId: d.TeamId ?? null
        }))
      },
      message: `Found **${domains.length}** domain(s): ${domains.map(d => d.hostname).join(', ')}`
    };
  })
  .build();
