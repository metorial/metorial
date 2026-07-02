import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let anchorTextResultSchema = z.object({
  anchorText: z.string().describe('The anchor text phrase'),
  externalPages: z.number().describe('Number of external pages using this anchor text'),
  externalRootDomains: z
    .number()
    .describe('Number of external root domains using this anchor text')
});

export let getAnchorTextTool = SlateTool.create(spec, {
  name: 'Get Anchor Text',
  key: 'get_anchor_text',
  description: `Retrieve anchor text data for links pointing to a target URL, subdomain, or root domain. Useful for identifying anchor text distribution, over-optimization issues, or understanding how others reference your content.`,
  constraints: ['Maximum of 50 results per request. Use nextToken for pagination.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('URL or domain to analyze anchor text for'),
      scope: z
        .enum(['page', 'subdomain', 'root_domain'])
        .optional()
        .describe('Scope of analysis'),
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
      results: z.array(anchorTextResultSchema).describe('Anchor text entries'),
      nextToken: z.string().optional().describe('Token for fetching next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let response = await client.getAnchorText({
      target: ctx.input.target,
      scope: ctx.input.scope,
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    let results = (response.results || []).map((r: any) => ({
      anchorText: r.anchor_text,
      externalPages: r.external_pages,
      externalRootDomains: r.external_root_domains
    }));

    return {
      output: {
        results,
        nextToken: response.next_token
      },
      message: `Found **${results.length}** anchor text entries for **${ctx.input.target}**.${results.length > 0 ? ` Top anchor: "${results[0]!.anchorText}" (${results[0]!.externalRootDomains} domains).` : ''}`
    };
  })
  .build();
