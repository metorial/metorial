import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List all available domains for URL shortening, including system-provided public domains and user-added custom (private) domains. Supports filtering by visibility and pagination.`,
  instructions: [
    'Custom domains must first be added and verified via the U301 dashboard by configuring a CNAME DNS record.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      visibility: z
        .enum(['public', 'private', 'all'])
        .optional()
        .describe(
          'Filter domains by visibility: public (system domains), private (custom domains), or all'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (1-500)')
    })
  )
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            domainName: z.string().describe('The domain name'),
            visibility: z.string().describe('Domain visibility: public or private')
          })
        )
        .describe('List of available domains'),
      total: z.number().describe('Total number of domains'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Fetching domains...');

    let result = await client.listDomains({
      visibility: ctx.input.visibility,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    return {
      output: {
        domains: result.data,
        total: result.meta.total,
        currentPage: result.meta.currentPage,
        lastPage: result.meta.lastPage
      },
      message: `Found **${result.meta.total}** domain(s) (page ${result.meta.currentPage} of ${result.meta.lastPage}).`
    };
  })
  .build();
