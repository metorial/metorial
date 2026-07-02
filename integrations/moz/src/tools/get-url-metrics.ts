import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let urlMetricsResultSchema = z
  .object({
    page: z.string().optional().describe('The exact URL analyzed'),
    subdomain: z.string().optional().describe('Subdomain of the URL'),
    rootDomain: z.string().optional().describe('Root domain of the URL'),
    title: z.string().optional().describe('Page title'),
    lastCrawled: z.string().optional().describe('Date last crawled'),
    httpCode: z.number().optional().describe('HTTP status code'),
    pageAuthority: z.number().optional().describe('Page Authority score (1-100)'),
    domainAuthority: z.number().optional().describe('Domain Authority score (1-100)'),
    spamScore: z.number().optional().describe('Spam Score (1-100, -1 if unknown)'),
    linkPropensity: z.number().optional().describe('Link propensity score (0-1)'),
    pagesToPage: z.number().optional().describe('Total links to this page'),
    externalPagesToPage: z.number().optional().describe('External links to this page'),
    rootDomainsToPage: z.number().optional().describe('Root domains linking to this page'),
    pagesToSubdomain: z.number().optional().describe('Total links to this subdomain'),
    externalPagesToSubdomain: z
      .number()
      .optional()
      .describe('External links to this subdomain'),
    rootDomainsToSubdomain: z
      .number()
      .optional()
      .describe('Root domains linking to this subdomain'),
    pagesToRootDomain: z.number().optional().describe('Total links to this root domain'),
    externalPagesToRootDomain: z
      .number()
      .optional()
      .describe('External links to this root domain'),
    rootDomainsToRootDomain: z
      .number()
      .optional()
      .describe('Root domains linking to this root domain')
  })
  .passthrough();

let mapResult = (r: any) => {
  let mapped: Record<string, any> = {};
  if (r.page !== undefined) mapped.page = r.page;
  if (r.subdomain !== undefined) mapped.subdomain = r.subdomain;
  if (r.root_domain !== undefined) mapped.rootDomain = r.root_domain;
  if (r.title !== undefined) mapped.title = r.title;
  if (r.last_crawled !== undefined) mapped.lastCrawled = r.last_crawled;
  if (r.http_code !== undefined) mapped.httpCode = r.http_code;
  if (r.page_authority !== undefined) mapped.pageAuthority = r.page_authority;
  if (r.domain_authority !== undefined) mapped.domainAuthority = r.domain_authority;
  if (r.spam_score !== undefined) mapped.spamScore = r.spam_score;
  if (r.link_propensity !== undefined) mapped.linkPropensity = r.link_propensity;
  if (r.pages_to_page !== undefined) mapped.pagesToPage = r.pages_to_page;
  if (r.external_pages_to_page !== undefined)
    mapped.externalPagesToPage = r.external_pages_to_page;
  if (r.root_domains_to_page !== undefined) mapped.rootDomainsToPage = r.root_domains_to_page;
  if (r.pages_to_subdomain !== undefined) mapped.pagesToSubdomain = r.pages_to_subdomain;
  if (r.external_pages_to_subdomain !== undefined)
    mapped.externalPagesToSubdomain = r.external_pages_to_subdomain;
  if (r.root_domains_to_subdomain !== undefined)
    mapped.rootDomainsToSubdomain = r.root_domains_to_subdomain;
  if (r.pages_to_root_domain !== undefined) mapped.pagesToRootDomain = r.pages_to_root_domain;
  if (r.external_pages_to_root_domain !== undefined)
    mapped.externalPagesToRootDomain = r.external_pages_to_root_domain;
  if (r.root_domains_to_root_domain !== undefined)
    mapped.rootDomainsToRootDomain = r.root_domains_to_root_domain;
  return mapped;
};

export let getUrlMetricsTool = SlateTool.create(spec, {
  name: 'Get URL Metrics',
  key: 'get_url_metrics',
  description: `Retrieve SEO metrics for one or more URLs, including Domain Authority, Page Authority, Spam Score, link propensity, and link counts at page, subdomain, and root domain levels. Supports bulk lookups of up to 50 URLs in a single request.`,
  constraints: [
    'Maximum of 50 URLs per request.',
    'This is a weighted endpoint that consumes multiple API rows.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      targets: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe('URLs or domains to analyze (up to 50)'),
      includeDistributions: z
        .boolean()
        .optional()
        .describe('Include bucketed link distribution metrics')
    })
  )
  .output(
    z.object({
      results: z.array(urlMetricsResultSchema).describe('Metrics for each requested target')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let response = await client.getUrlMetrics({
      targets: ctx.input.targets,
      distributions: ctx.input.includeDistributions
    });

    let results = (response.results || []).map(mapResult);

    return {
      output: { results },
      message: `Retrieved metrics for **${results.length}** URL(s). ${results.map((r: any) => `**${r.page || r.rootDomain}**: DA ${r.domainAuthority ?? 'N/A'}, PA ${r.pageAuthority ?? 'N/A'}`).join('; ')}`
    };
  })
  .build();
