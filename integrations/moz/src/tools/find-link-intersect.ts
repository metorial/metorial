import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let intersectTargetSchema = z.object({
  query: z.string().describe('URL or domain'),
  scope: z.enum(['page', 'subdomain', 'root_domain']).describe('Scope level')
});

let intersectResultSchema = z
  .object({
    sourcePage: z.string().optional().describe('Source page URL'),
    sourceRootDomain: z.string().optional().describe('Source root domain'),
    sourceDomainAuthority: z.number().optional().describe('Source Domain Authority'),
    sourcePageAuthority: z.number().optional().describe('Source Page Authority'),
    sourceSpamScore: z.number().optional().describe('Source Spam Score'),
    matchingTargetCount: z
      .number()
      .optional()
      .describe('Number of matched targets this source links to')
  })
  .passthrough();

export let findLinkIntersectTool = SlateTool.create(spec, {
  name: 'Find Link Intersect',
  key: 'find_link_intersect',
  description: `Discover linking opportunities by finding sites that link to your competitors but not to you. Provide a list of competitor sites to find common linkers, and optionally specify sites that should NOT be linked to (typically your own site). Returns sources sorted by how many of the target sites they link to. Supports up to 6 total targets.`,
  instructions: [
    'Provide competitor sites in "isLinkingTo" and your own site in "notLinkingTo" to find link-building opportunities.'
  ],
  constraints: ['Maximum of 6 total targets across isLinkingTo and notLinkingTo combined.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      isLinkingTo: z
        .array(intersectTargetSchema)
        .min(1)
        .describe('Sites that sources must link to (competitors)'),
      notLinkingTo: z
        .array(intersectTargetSchema)
        .optional()
        .describe('Sites that sources must NOT link to (your site)'),
      minimumMatchingTargets: z
        .number()
        .optional()
        .describe('Minimum number of targets a source must link to'),
      sourceScope: z
        .enum(['page', 'subdomain', 'root_domain'])
        .optional()
        .describe('Scope of source results'),
      sort: z.string().optional().describe('Sort order (e.g. "matching_target_count")'),
      limit: z.number().min(1).max(50).optional().describe('Number of results (1-50)'),
      nextToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      results: z
        .array(intersectResultSchema)
        .describe('Sources that link to the specified targets'),
      nextToken: z.string().optional().describe('Token for fetching next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let response = await client.getLinkIntersect({
      isLinkingTo: ctx.input.isLinkingTo,
      notLinkingTo: ctx.input.notLinkingTo,
      minimumMatchingTargets: ctx.input.minimumMatchingTargets,
      sourceScope: ctx.input.sourceScope,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let results = (response.results || []).map((r: any) => ({
      sourcePage: r.page || r.source?.page,
      sourceRootDomain: r.root_domain || r.source?.root_domain,
      sourceDomainAuthority: r.domain_authority || r.source?.domain_authority,
      sourcePageAuthority: r.page_authority || r.source?.page_authority,
      sourceSpamScore: r.spam_score || r.source?.spam_score,
      matchingTargetCount: r.matching_target_count
    }));

    return {
      output: {
        results,
        nextToken: response.next_token
      },
      message: `Found **${results.length}** link intersect sources.${response.next_token ? ' More results available.' : ''}`
    };
  })
  .build();
