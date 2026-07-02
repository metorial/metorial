import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let topPageSchema = z
  .object({
    page: z.string().optional().describe('Page URL'),
    title: z.string().optional().describe('Page title'),
    httpCode: z.number().optional().describe('HTTP status code'),
    pageAuthority: z.number().optional().describe('Page Authority (1-100)'),
    domainAuthority: z.number().optional().describe('Domain Authority (1-100)'),
    spamScore: z.number().optional().describe('Spam Score'),
    linkPropensity: z.number().optional().describe('Link propensity'),
    externalPagesToPage: z.number().optional().describe('External links to this page'),
    rootDomainsToPage: z.number().optional().describe('Root domains linking to this page'),
    lastCrawled: z.string().optional().describe('Date last crawled')
  })
  .passthrough();

export let getTopPagesTool = SlateTool.create(spec, {
  name: 'Get Top Pages',
  key: 'get_top_pages',
  description: `Retrieve the top pages on a target domain, ranked by Page Authority, linking domains, or inbound links. Can filter by HTTP status code to find broken pages (4xx/5xx) with backlinks. Useful for identifying a site's most authoritative pages or finding link reclamation opportunities.`,
  constraints: ['Maximum of 50 results per request. Use nextToken for pagination.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Domain to get top pages for'),
      scope: z
        .enum(['subdomain', 'root_domain'])
        .optional()
        .describe('Scope of analysis (default: root_domain)'),
      sort: z
        .enum(['page_authority', 'root_domains_to_page', 'external_pages_to_page'])
        .optional()
        .describe('Sort order (default: page_authority)'),
      filter: z
        .enum(['all', 'status_200', 'status_301', 'status_302', 'status_4xx', 'status_5xx'])
        .optional()
        .describe('Filter by HTTP status code'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results (1-50, default 25)'),
      nextToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      results: z.array(topPageSchema).describe('List of top pages'),
      nextToken: z.string().optional().describe('Token for fetching next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let response = await client.getTopPages({
      target: ctx.input.target,
      scope: ctx.input.scope,
      sort: ctx.input.sort,
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let results = (response.results || []).map((r: any) => ({
      page: r.page,
      title: r.title,
      httpCode: r.http_code,
      pageAuthority: r.page_authority,
      domainAuthority: r.domain_authority,
      spamScore: r.spam_score,
      linkPropensity: r.link_propensity,
      externalPagesToPage: r.external_pages_to_page,
      rootDomainsToPage: r.root_domains_to_page,
      lastCrawled: r.last_crawled
    }));

    return {
      output: {
        results,
        nextToken: response.next_token
      },
      message: `Found **${results.length}** top pages for **${ctx.input.target}**.${results.length > 0 ? ` Highest PA: **${results[0]!.page}** (PA ${results[0]!.pageAuthority}).` : ''}`
    };
  })
  .build();
