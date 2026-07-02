import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let siteMetricsSchema = z
  .object({
    site: z.string().describe('The domain analyzed'),
    domainAuthority: z.number().optional().describe('Domain Authority (1-100)'),
    brandAuthority: z.number().optional().describe('Brand Authority score'),
    spamScore: z.number().optional().describe('Spam Score'),
    linkPropensity: z.number().optional().describe('Link propensity (0-1)'),
    rootDomainsToRootDomain: z
      .number()
      .optional()
      .describe('Root domains linking to this domain'),
    pagesToRootDomain: z.number().optional().describe('Total pages linking to this domain'),
    externalPagesToRootDomain: z
      .number()
      .optional()
      .describe('External pages linking to this domain')
  })
  .passthrough();

export let getSiteMetricsTool = SlateTool.create(spec, {
  name: 'Get Site Metrics',
  key: 'get_site_metrics',
  description: `Retrieve comprehensive site-level metrics for one or more domains, including Domain Authority, Brand Authority, Spam Score, link propensity, and link counts. Supports analyzing multiple sites at once for comparison. Also retrieves Brand Authority scores.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sites: z.array(z.string()).min(1).describe('One or more domains to analyze')
    })
  )
  .output(
    z.object({
      results: z.array(siteMetricsSchema).describe('Metrics for each site')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let results: any[];

    if (ctx.input.sites.length === 1) {
      let [siteResult, brandResult] = await Promise.all([
        client.getSiteMetrics({ query: ctx.input.sites[0]! }),
        client.getBrandAuthority({ query: ctx.input.sites[0]! }).catch(() => null)
      ]);

      results = [
        {
          site: ctx.input.sites[0],
          domainAuthority: siteResult?.domain_authority,
          brandAuthority: brandResult?.brand_authority,
          spamScore: siteResult?.spam_score,
          linkPropensity: siteResult?.link_propensity,
          rootDomainsToRootDomain: siteResult?.root_domains_to_root_domain,
          pagesToRootDomain: siteResult?.pages_to_root_domain,
          externalPagesToRootDomain: siteResult?.external_pages_to_root_domain,
          ...siteResult
        }
      ];
    } else {
      let multiResult = await client.getSiteMetricsMultiple({ sites: ctx.input.sites });
      let siteResults = multiResult?.results || multiResult || [];
      results = (Array.isArray(siteResults) ? siteResults : [siteResults]).map(
        (r: any, i: number) => ({
          site: r?.site || r?.root_domain || ctx.input.sites[i],
          domainAuthority: r?.domain_authority,
          brandAuthority: r?.brand_authority,
          spamScore: r?.spam_score,
          linkPropensity: r?.link_propensity,
          rootDomainsToRootDomain: r?.root_domains_to_root_domain,
          pagesToRootDomain: r?.pages_to_root_domain,
          externalPagesToRootDomain: r?.external_pages_to_root_domain,
          ...r
        })
      );
    }

    return {
      output: { results },
      message: `Retrieved metrics for **${results.length}** site(s). ${results.map((r: any) => `**${r.site}**: DA ${r.domainAuthority ?? 'N/A'}`).join(', ')}`
    };
  })
  .build();
