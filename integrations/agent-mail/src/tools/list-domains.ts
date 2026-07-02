import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List all custom email domains in the account with their verification status and DNS records. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum domains per page'),
      pageToken: z.string().optional().describe('Pagination cursor from a previous response'),
      ascending: z.boolean().optional().describe('Sort oldest first when true')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of domains in this page'),
      nextPageToken: z.string().optional().describe('Cursor for the next page'),
      domains: z
        .array(
          z.object({
            domainId: z.string().describe('Domain identifier'),
            domain: z.string().describe('Domain name'),
            status: z.string().describe('Verification status'),
            feedbackEnabled: z
              .boolean()
              .describe('Whether bounce/complaint feedback is enabled'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('Array of domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.listDomains({
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken,
      ascending: ctx.input.ascending
    });

    let domains = result.domains.map(d => ({
      domainId: d.domain_id,
      domain: d.domain,
      status: d.status,
      feedbackEnabled: d.feedback_enabled,
      createdAt: d.created_at
    }));

    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        domains
      },
      message: `Found **${result.count}** domain(s).`
    };
  })
  .build();
