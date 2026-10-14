import { buildApiServiceError, SlateTool } from 'slates';
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
  description: `Retrieve comprehensive site-level metrics for one or more domains, including Domain Authority, Brand Authority, Spam Score, link propensity, and link counts. Supports analyzing multiple sites at once for comparison. Single-site requests also retrieve Brand Authority scores.`,
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
      results: z.array(siteMetricsSchema).describe('Metrics for each site'),
      errors: z.array(z.any()).optional().describe('Provider errors for sites without metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let results: any[];
    let multiErrors: any[] = [];

    if (ctx.input.sites.length === 1) {
      let [siteResult, brandResult] = await Promise.all([
        client.getSiteMetrics({ query: ctx.input.sites[0]! }),
        client.getBrandAuthority({ query: ctx.input.sites[0]! })
      ]);

      let metrics = siteResult?.site_metrics ?? siteResult;
      let brandMetrics = brandResult?.site_metrics ?? brandResult;
      results = [
        {
          site: ctx.input.sites[0],
          domainAuthority: metrics?.domain_authority,
          brandAuthority: brandMetrics?.brand_authority_score ?? brandMetrics?.brand_authority,
          spamScore: metrics?.spam_score,
          linkPropensity: metrics?.link_propensity,
          rootDomainsToRootDomain: metrics?.root_domains_to_root_domain,
          pagesToRootDomain: metrics?.pages_to_root_domain,
          externalPagesToRootDomain: metrics?.external_pages_to_root_domain,
          ...metrics
        }
      ];
    } else {
      let multiResult = await client.getSiteMetricsMultiple({ sites: ctx.input.sites });
      multiErrors = multiResult?.errors_by_site ?? [];
      let siteResults =
        multiResult?.results_by_site ?? multiResult?.results ?? multiResult ?? [];
      results = (Array.isArray(siteResults) ? siteResults : [siteResults]).map(
        (entry: any, i: number) => {
          let r = entry.site_metrics ?? entry;
          return {
            site: r?.site || r?.root_domain || ctx.input.sites[i],
            domainAuthority: r?.domain_authority,
            brandAuthority: r?.brand_authority,
            spamScore: r?.spam_score,
            linkPropensity: r?.link_propensity,
            rootDomainsToRootDomain: r?.root_domains_to_root_domain,
            pagesToRootDomain: r?.pages_to_root_domain,
            externalPagesToRootDomain: r?.external_pages_to_root_domain,
            ...r
          };
        }
      );
    }

    if (!results.length && multiErrors.length) {
      let error = multiErrors[0].error;
      throw buildApiServiceError(
        { response: { status: error?.status, data: error } },
        { providerLabel: 'Moz', reason: 'moz_site_metrics_error', operation: 'site metrics' }
      );
    }
    let errors = multiErrors;
    return {
      output: { results, ...(errors.length ? { errors } : {}) },
      message: `Retrieved metrics for **${results.length}** site(s).${errors.length ? ` ${errors.length} site(s) failed; see errors.` : ''} ${results.map((r: any) => `**${r.site}**: DA ${r.domainAuthority ?? 'N/A'}`).join(', ')}`
    };
  })
  .build();
