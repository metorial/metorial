import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

let linkStatusResultSchema = z.object({
  source: z.string().describe('Source URL or domain checked'),
  linksToTarget: z.boolean().describe('Whether this source links to the target')
});

export let checkLinkStatusTool = SlateTool.create(spec, {
  name: 'Check Link Status',
  key: 'check_link_status',
  description: `Check whether specific source domains or URLs link to a given target. Returns a boolean for each source indicating if a link exists. Useful for verifying backlinks, checking if outreach efforts resulted in links, or auditing link partnerships.`,
  constraints: [
    'Maximum of 50 sources per request.',
    'This is a weighted endpoint (2x row consumption).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Target URL or domain to check links against'),
      sources: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe('Source URLs or domains to check (up to 50)'),
      targetScope: z
        .enum(['page', 'subdomain', 'root_domain'])
        .optional()
        .describe('Scope of the target'),
      sourceScope: z
        .enum(['page', 'subdomain', 'root_domain'])
        .optional()
        .describe('Scope of the sources')
    })
  )
  .output(
    z.object({
      results: z.array(linkStatusResultSchema).describe('Link status for each source')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let response = await client.getLinkStatus({
      target: ctx.input.target,
      sources: ctx.input.sources,
      targetScope: ctx.input.targetScope,
      sourceScope: ctx.input.sourceScope
    });

    let existsArray = response.exists || [];
    let results = ctx.input.sources.map((source, i) => ({
      source,
      linksToTarget: existsArray[i] ?? false
    }));

    let linkingCount = results.filter(r => r.linksToTarget).length;

    return {
      output: { results },
      message: `**${linkingCount}** of **${results.length}** sources link to **${ctx.input.target}**.`
    };
  })
  .build();
