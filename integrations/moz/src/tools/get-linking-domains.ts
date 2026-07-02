import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let linkingDomainSchema = z
  .object({
    rootDomain: z.string().describe('The linking root domain'),
    domainAuthority: z.number().optional().describe('Domain Authority of the linking domain'),
    rootDomainsToRootDomain: z
      .number()
      .optional()
      .describe('Root domains linking to this domain'),
    linkPropensity: z.number().optional().describe('Link propensity score (0-1)'),
    spamScore: z.number().optional().describe('Spam score'),
    pagesToTarget: z
      .number()
      .optional()
      .describe('Pages from this domain linking to the target'),
    nofollowPagesToTarget: z.number().optional().describe('Nofollow pages linking to target'),
    redirectPagesToTarget: z.number().optional().describe('Redirect pages linking to target'),
    deletedPagesToTarget: z.number().optional().describe('Deleted pages linking to target'),
    dateGained: z.string().optional().describe('Date the link was first gained'),
    dateLost: z.string().optional().describe('Date the link was lost (if applicable)')
  })
  .passthrough();

export let getLinkingDomainsTool = SlateTool.create(spec, {
  name: 'Get Linking Domains',
  key: 'get_linking_domains',
  description: `Retrieve a list of root domains that link to a target URL or domain. Returns domain-level metrics including Domain Authority, spam score, link propensity, and date information. Can be filtered by follow/nofollow status and sorted by various metrics. Supports date range filtering when sorting by date gained or lost.`,
  constraints: [
    'Maximum of 50 results per request. Use nextToken for pagination.',
    'Date range filtering only available when sort is "date_gained" or "date_lost".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('URL or domain to get linking domains for'),
      targetScope: z
        .enum(['page', 'subdomain', 'root_domain'])
        .optional()
        .describe('Scope of the target'),
      sort: z
        .enum([
          'source_domain_authority',
          'source_link_propensity',
          'source_spam_score',
          'date_gained',
          'date_lost'
        ])
        .optional()
        .describe('Sort order'),
      filter: z
        .string()
        .optional()
        .describe(
          'Filter: combine with "+". Options: external, follow, nofollow, deleted, not_deleted'
        ),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results (1-50, default 25)'),
      nextToken: z.string().optional().describe('Pagination token'),
      beginDate: z
        .string()
        .optional()
        .describe('Start date (YYYY-MM-DD), only when sorting by date_gained or date_lost'),
      endDate: z
        .string()
        .optional()
        .describe('End date (YYYY-MM-DD), only when sorting by date_gained or date_lost')
    })
  )
  .output(
    z.object({
      results: z.array(linkingDomainSchema).describe('List of linking root domains'),
      nextToken: z.string().optional().describe('Token for fetching next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let response = await client.getLinkingRootDomains({
      target: ctx.input.target,
      targetScope: ctx.input.targetScope,
      sort: ctx.input.sort,
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken,
      beginDate: ctx.input.beginDate,
      endDate: ctx.input.endDate
    });

    let results = (response.results || []).map((r: any) => ({
      rootDomain: r.root_domain,
      domainAuthority: r.domain_authority,
      rootDomainsToRootDomain: r.root_domains_to_root_domain,
      linkPropensity: r.link_propensity,
      spamScore: r.spam_score,
      pagesToTarget: r.to_target?.pages,
      nofollowPagesToTarget: r.to_target?.nofollow_pages,
      redirectPagesToTarget: r.to_target?.redirect_pages,
      deletedPagesToTarget: r.to_target?.deleted_pages,
      dateGained: r.date_gained,
      dateLost: r.date_lost
    }));

    return {
      output: {
        results,
        nextToken: response.next_token
      },
      message: `Found **${results.length}** linking domains for **${ctx.input.target}**.${response.next_token ? ' More results available.' : ''}`
    };
  })
  .build();
