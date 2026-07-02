import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let linkResultSchema = z
  .object({
    sourcePage: z.string().optional().describe('Source page URL'),
    sourceRootDomain: z.string().optional().describe('Source root domain'),
    sourcePageAuthority: z.number().optional().describe('Source page authority'),
    sourceDomainAuthority: z.number().optional().describe('Source domain authority'),
    sourceSpamScore: z.number().optional().describe('Source spam score'),
    targetPage: z.string().optional().describe('Target page URL'),
    targetRootDomain: z.string().optional().describe('Target root domain'),
    anchorText: z.string().optional().describe('Anchor text of the link'),
    dateFirstSeen: z.string().optional().describe('Date the link was first discovered'),
    dateLastSeen: z.string().optional().describe('Date the link was last seen'),
    nofollow: z.boolean().optional().describe('Whether the link is nofollow'),
    redirect: z.boolean().optional().describe('Whether the link is a redirect')
  })
  .passthrough();

export let getLinksTool = SlateTool.create(spec, {
  name: 'Get Backlinks',
  key: 'get_backlinks',
  description: `Retrieve a list of inbound links (backlinks) pointing to any URL or domain. Returns detailed information about each linking page including anchor text, link attributes, and source authority metrics. Results can be filtered by follow/nofollow status, internal/external links, and sorted by various authority metrics.`,
  constraints: ['Maximum of 50 results per request. Use nextToken for pagination.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('URL or domain to get backlinks for'),
      targetScope: z
        .enum(['page', 'subdomain', 'root_domain'])
        .optional()
        .describe('Scope of the target analysis'),
      sourceScope: z
        .enum(['page', 'subdomain', 'root_domain'])
        .optional()
        .describe('Returns best link per source at this scope'),
      sort: z
        .enum([
          'source_page_authority',
          'source_domain_authority',
          'source_link_propensity',
          'source_spam_score'
        ])
        .optional()
        .describe('Sort order for results'),
      filter: z
        .string()
        .optional()
        .describe(
          'Filter links: combine with "+", e.g. "external+follow". Options: external, follow, nofollow, redirect, deleted, gained_last_60_days, lost_last_60_days'
        ),
      anchorText: z.string().optional().describe('Filter by anchor text'),
      sourceRootDomain: z
        .string()
        .optional()
        .describe('Restrict to links from a specific root domain'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of results (1-50, default 25)'),
      nextToken: z.string().optional().describe('Pagination token from previous response')
    })
  )
  .output(
    z.object({
      results: z.array(linkResultSchema).describe('List of backlinks'),
      nextToken: z.string().optional().describe('Token for fetching next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let response = await client.getLinks({
      target: ctx.input.target,
      targetScope: ctx.input.targetScope,
      sourceScope: ctx.input.sourceScope,
      sort: ctx.input.sort,
      filter: ctx.input.filter,
      anchorText: ctx.input.anchorText,
      sourceRootDomain: ctx.input.sourceRootDomain,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let results = (response.results || []).map((r: any) => ({
      sourcePage: r.source?.page,
      sourceRootDomain: r.source?.root_domain,
      sourcePageAuthority: r.source?.page_authority,
      sourceDomainAuthority: r.source?.domain_authority,
      sourceSpamScore: r.source?.spam_score,
      targetPage: r.target?.page,
      targetRootDomain: r.target?.root_domain,
      anchorText: r.anchor_text,
      dateFirstSeen: r.date_first_seen,
      dateLastSeen: r.date_last_seen,
      nofollow: r.nofollow,
      redirect: r.redirect
    }));

    return {
      output: {
        results,
        nextToken: response.next_token
      },
      message: `Found **${results.length}** backlinks to **${ctx.input.target}**.${response.next_token ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
