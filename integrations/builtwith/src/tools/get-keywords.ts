import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let domainKeywordsSchema = z
  .object({
    domain: z.string().optional().describe('Domain name'),
    keywords: z.array(z.string()).optional().describe('Keywords associated with the domain')
  })
  .passthrough();

export let getKeywords = SlateTool.create(spec, {
  name: 'Get Domain Keywords',
  key: 'get_keywords',
  description: `Extract keywords connected to one or more websites. Supports multi-domain lookups (up to 16 domains at once) for batch keyword analysis.`,
  constraints: ['Maximum 16 domains per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domains: z
        .array(z.string())
        .min(1)
        .max(16)
        .describe('Domain(s) to extract keywords for (up to 16)')
    })
  )
  .output(
    z.object({
      results: z.array(domainKeywordsSchema).describe('Keywords for each domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.keywords(ctx.input.domains);

    let results = data?.Results ?? [];

    return {
      output: {
        results
      },
      message: `Extracted keywords for **${ctx.input.domains.length}** domain(s).`
    };
  });
