import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List all domains registered in the Short.io account. Returns domain IDs, hostnames, and status for each domain. Useful for discovering available domains and their IDs for use with other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainId: z.number().describe('The unique domain ID.'),
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

    let domains = await client.listDomains();

    return {
      output: {
        domains: domains.map(d => ({
          domainId: d.id,
          hostname: d.hostname,
          title: d.title,
          state: d.state,
          createdAt: d.createdAt,
          teamId: d.TeamId
        }))
      },
      message: `Found **${domains.length}** domain(s): ${domains.map(d => d.hostname).join(', ')}`
    };
  })
  .build();
