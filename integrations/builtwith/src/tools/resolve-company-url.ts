import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let resolvedUrlSchema = z
  .object({
    domain: z.string().optional().describe('Resolved domain name'),
    url: z.string().optional().describe('Full URL')
  })
  .passthrough();

export let resolveCompanyUrl = SlateTool.create(spec, {
  name: 'Resolve Company to URL',
  key: 'resolve_company_url',
  description: `Resolve a company name to its associated domain name(s). Results are prioritized — the first result is generally the best match. You can specify a preferred TLD to match the expected country (e.g., ".co.uk" for UK companies).`,
  instructions: [
    'Provide the company name as it is commonly known.',
    'Use tld to prioritize domains from a specific country (e.g., "uk" for .co.uk, "com" for .com).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      company: z.string().describe('Company name to resolve (e.g., "Microsoft", "Shopify")'),
      amount: z.number().optional().describe('Number of results to return'),
      tld: z
        .string()
        .optional()
        .describe('Preferred top-level domain to prioritize (e.g., "com", "uk", "de")')
    })
  )
  .output(
    z.object({
      company: z.string().describe('Company name queried'),
      urls: z.array(resolvedUrlSchema).describe('Resolved domain(s) for the company')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.companyToUrl({
      company: ctx.input.company,
      amount: ctx.input.amount,
      tld: ctx.input.tld
    });

    let urls = data?.Results ?? [];

    return {
      output: {
        company: ctx.input.company,
        urls
      },
      message: `Resolved **${urls.length}** domain(s) for company **${ctx.input.company}**.`
    };
  });
