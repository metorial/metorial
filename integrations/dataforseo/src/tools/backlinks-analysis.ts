import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
let optionalNumber = (value: unknown) => (typeof value === 'number' ? value : undefined);
let optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

let backlinkItemSchema = z
  .object({
    type: z.string().optional().describe('Type of backlink (anchor, redirect, etc.)'),
    domainFrom: z.string().optional().describe('Referring domain'),
    urlFrom: z.string().optional().describe('Referring page URL'),
    urlTo: z.string().optional().describe('Target page URL'),
    anchor: z.string().optional().describe('Anchor text of the backlink'),
    isLost: z.boolean().optional().describe('Whether the backlink is lost'),
    dofollow: z.boolean().optional().describe('Whether the link is dofollow'),
    pageFromRank: z.number().optional().describe('DataForSEO rank of the referring page'),
    domainFromRank: z.number().optional().describe('DataForSEO rank of the referring domain'),
    firstSeen: z.string().optional().describe('Date when the backlink was first discovered'),
    lastSeen: z.string().optional().describe('Date when the backlink was last seen')
  })
  .passthrough();

export let backlinksAnalysis = SlateTool.create(spec, {
  name: 'Backlinks Analysis',
  key: 'backlinks_analysis',
  description: `Analyze the backlink profile of any domain, subdomain, or URL. Retrieves a summary of backlink metrics (total backlinks, referring domains, rank, etc.) and optionally lists individual backlinks or referring domains. Useful for link building research, competitor analysis, and SEO auditing.`,
  instructions: [
    'Provide a target domain, subdomain, or URL to analyze its backlink profile.',
    'Choose the mode: "summary" for aggregate metrics, "backlinks" for individual link listing, or "referring_domains" for domain-level analysis.',
    'Use filters and ordering for the backlinks and referring_domains modes to narrow results.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target: z
        .string()
        .describe('Domain, subdomain, or URL to analyze (e.g., "example.com")'),
      mode: z
        .enum(['summary', 'backlinks', 'referring_domains'])
        .default('summary')
        .describe('Analysis mode'),
      includeSubdomains: z.boolean().optional().describe('Include subdomains in the analysis'),
      includeIndirectLinks: z
        .boolean()
        .optional()
        .describe('Include indirect links in the provider dataset'),
      backlinksStatusType: z
        .enum(['all', 'live', 'lost'])
        .optional()
        .describe('Backlink status dataset to use. Defaults to DataForSEO live backlinks.'),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum number of results to return (for backlinks and referring_domains modes)'
        ),
      offset: z.number().optional().describe('Offset for pagination'),
      filters: z
        .array(z.any())
        .optional()
        .describe(
          'Result filters for backlinks and referring_domains modes (e.g., ["rank",">","80"] or ["backlinks",">",100])'
        ),
      backlinksFilters: z
        .array(z.any())
        .optional()
        .describe(
          'Backlink-level filters for summary and referring_domains aggregation (e.g., ["dofollow","=",true]). For backwards compatibility, used as backlinks mode filters when filters is not provided.'
        ),
      orderBy: z.array(z.string()).optional().describe('Order results (e.g., ["rank,desc"])')
    })
  )
  .output(
    z.object({
      target: z.string().describe('Analyzed target'),
      totalBacklinks: z.number().optional().describe('Total number of backlinks'),
      totalReferringDomains: z.number().optional().describe('Total referring domains'),
      rank: z.number().optional().describe('DataForSEO rank of the target'),
      brokenBacklinks: z.number().optional().describe('Number of broken backlinks'),
      referringIps: z.number().optional().describe('Number of referring IPs'),
      referringSubnets: z.number().optional().describe('Number of referring subnets'),
      backlinks: z
        .array(backlinkItemSchema)
        .optional()
        .describe('Individual backlink items (when mode is backlinks)'),
      referringDomains: z
        .array(
          z
            .object({
              domain: z.string().optional().describe('Referring domain'),
              rank: z.number().optional().describe('Domain rank'),
              backlinks: z
                .number()
                .optional()
                .describe('Number of backlinks from this domain'),
              firstSeen: z.string().optional().describe('Date first seen')
            })
            .passthrough()
        )
        .optional()
        .describe('Referring domain items (when mode is referring_domains)'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { mode } = ctx.input;

    if (mode === 'summary') {
      let response = await client.backlinksSummaryLive({
        target: ctx.input.target,
        includeSubdomains: ctx.input.includeSubdomains,
        includeIndirectLinks: ctx.input.includeIndirectLinks,
        backlinksFilters: ctx.input.backlinksFilters,
        backlinksStatusType: ctx.input.backlinksStatusType
      });

      let result = client.extractFirstResult(response);

      return {
        output: {
          target: ctx.input.target,
          totalBacklinks: optionalNumber(result?.backlinks),
          totalReferringDomains: optionalNumber(result?.referring_domains),
          rank: optionalNumber(result?.rank),
          brokenBacklinks: optionalNumber(result?.broken_backlinks),
          referringIps: optionalNumber(result?.referring_ips),
          referringSubnets: optionalNumber(result?.referring_subnets),
          cost: response.cost
        },
        message: `Backlink summary for **${ctx.input.target}**: **${result?.backlinks ?? 0}** backlinks from **${result?.referring_domains ?? 0}** referring domains. Rank: **${result?.rank ?? 'N/A'}**.`
      };
    } else if (mode === 'backlinks') {
      let response = await client.backlinksLive({
        target: ctx.input.target,
        filters: ctx.input.filters,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        includeSubdomains: ctx.input.includeSubdomains,
        includeIndirectLinks: ctx.input.includeIndirectLinks,
        backlinksFilters: ctx.input.backlinksFilters,
        backlinksStatusType: ctx.input.backlinksStatusType,
        orderBy: ctx.input.orderBy
      });

      let result = client.extractFirstResult(response);
      let items = (result?.items ?? []).map((item: any) => ({
        type: optionalString(item.type),
        domainFrom: optionalString(item.domain_from),
        urlFrom: optionalString(item.url_from),
        urlTo: optionalString(item.url_to),
        anchor: optionalString(item.anchor),
        isLost: optionalBoolean(item.is_lost),
        dofollow: optionalBoolean(item.dofollow),
        pageFromRank: optionalNumber(item.page_from_rank),
        domainFromRank: optionalNumber(item.domain_from_rank),
        firstSeen: optionalString(item.first_seen),
        lastSeen: optionalString(item.last_seen)
      }));

      return {
        output: {
          target: ctx.input.target,
          totalBacklinks: optionalNumber(result?.total_count),
          backlinks: items,
          cost: response.cost
        },
        message: `Found **${items.length}** backlinks for **${ctx.input.target}** (total: ${result?.total_count ?? 'unknown'}).`
      };
    } else {
      let response = await client.backlinksReferringDomainsLive({
        target: ctx.input.target,
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        filters: ctx.input.filters,
        backlinksFilters: ctx.input.backlinksFilters,
        includeSubdomains: ctx.input.includeSubdomains,
        includeIndirectLinks: ctx.input.includeIndirectLinks,
        backlinksStatusType: ctx.input.backlinksStatusType,
        orderBy: ctx.input.orderBy
      });

      let result = client.extractFirstResult(response);
      let items = (result?.items ?? []).map((item: any) => ({
        domain: optionalString(item.domain),
        rank: optionalNumber(item.rank),
        backlinks: optionalNumber(item.backlinks),
        firstSeen: optionalString(item.first_seen)
      }));

      return {
        output: {
          target: ctx.input.target,
          totalReferringDomains: optionalNumber(result?.total_count),
          referringDomains: items,
          cost: response.cost
        },
        message: `Found **${items.length}** referring domains for **${ctx.input.target}** (total: ${result?.total_count ?? 'unknown'}).`
      };
    }
  })
  .build();
