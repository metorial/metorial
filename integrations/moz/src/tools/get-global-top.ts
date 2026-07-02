import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let globalPageSchema = z
  .object({
    page: z.string().optional().describe('Page URL'),
    rootDomain: z.string().optional().describe('Root domain'),
    pageAuthority: z.number().optional().describe('Page Authority (1-100)'),
    domainAuthority: z.number().optional().describe('Domain Authority (1-100)'),
    spamScore: z.number().optional().describe('Spam Score'),
    linkPropensity: z.number().optional().describe('Link propensity')
  })
  .passthrough();

let globalDomainSchema = z
  .object({
    rootDomain: z.string().optional().describe('Root domain'),
    domainAuthority: z.number().optional().describe('Domain Authority (1-100)'),
    rootDomainsToRootDomain: z
      .number()
      .optional()
      .describe('Root domains linking to this domain'),
    linkPropensity: z.number().optional().describe('Link propensity'),
    spamScore: z.number().optional().describe('Spam Score')
  })
  .passthrough();

export let getGlobalTopTool = SlateTool.create(spec, {
  name: 'Get Global Top Pages & Domains',
  key: 'get_global_top',
  description: `Retrieve the global top-ranking pages or domains across the entire Moz index. Returns the top 500 pages by Page Authority or top 500 domains by Domain Authority. Useful for benchmarking and understanding the highest-authority sites on the internet.`,
  constraints: ['Maximum of 500 total results available.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['pages', 'domains'])
        .describe('Whether to retrieve top pages or top domains'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results per request (1-50)'),
      nextToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      pages: z.array(globalPageSchema).optional().describe('Top pages (when type is "pages")'),
      domains: z
        .array(globalDomainSchema)
        .optional()
        .describe('Top domains (when type is "domains")'),
      nextToken: z.string().optional().describe('Token for fetching next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    if (ctx.input.type === 'pages') {
      let response = await client.getGlobalTopPages({
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });

      let pages = (response.results || []).map((r: any) => ({
        page: r.page,
        rootDomain: r.root_domain,
        pageAuthority: r.page_authority,
        domainAuthority: r.domain_authority,
        spamScore: r.spam_score,
        linkPropensity: r.link_propensity
      }));

      return {
        output: {
          pages,
          nextToken: response.next_token
        },
        message: `Retrieved **${pages.length}** global top pages by Page Authority.`
      };
    } else {
      let response = await client.getGlobalTopRootDomains({
        limit: ctx.input.limit,
        nextToken: ctx.input.nextToken
      });

      let domains = (response.results || []).map((r: any) => ({
        rootDomain: r.root_domain,
        domainAuthority: r.domain_authority,
        rootDomainsToRootDomain: r.root_domains_to_root_domain,
        linkPropensity: r.link_propensity,
        spamScore: r.spam_score
      }));

      return {
        output: {
          domains,
          nextToken: response.next_token
        },
        message: `Retrieved **${domains.length}** global top domains by Domain Authority.`
      };
    }
  })
  .build();
