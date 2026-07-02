import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

let companyMatchSchema = z.object({
  name: z.string().describe('Company name'),
  domain: z.string().describe('Corresponding website domain'),
  confidenceScore: z.number().describe('Confidence score for the match'),
  logoUrl: z.string().optional().describe('URL to the company logo')
});

export let autocompleteCompany = SlateTool.create(spec, {
  name: 'Autocomplete Company',
  key: 'autocomplete_company',
  description: `Resolve a company name to its website domain(s) with confidence scores and logos. This is a free API that does not consume credits.
Use this to enrich forms that capture company names, validate user-entered domains, or find a company's website from its name.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyName: z.string().describe('Company name to search for (e.g., "amazon")')
    })
  )
  .output(
    z.object({
      matches: z
        .array(companyMatchSchema)
        .describe('Matching companies with domains, confidence scores, and logos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.autocompleteCompany(ctx.input.companyName);
    let data = (result.data ?? []) as Record<string, unknown>[];

    let matches = data.map(entry => ({
      name: String(entry.name ?? ''),
      domain: String(entry.domain ?? ''),
      confidenceScore: Number(entry.confidence_score ?? 0),
      logoUrl: entry.logo_url as string | undefined
    }));

    let topMatch = matches[0];
    return {
      output: { matches },
      message:
        matches.length > 0
          ? `Found **${matches.length}** match(es) for "${ctx.input.companyName}". Top result: **${topMatch?.name}** → ${topMatch?.domain} (confidence: ${topMatch?.confidenceScore})`
          : `No matches found for "${ctx.input.companyName}".`
    };
  })
  .build();
