import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findPeople = SlateTool.create(spec, {
  name: 'Find People at Company',
  key: 'find_people',
  description: `Find people with specific job titles at a given company. Useful for prospecting and identifying decision-makers.
Returns up to 10 matching people per search. Identify the company by domain, LinkedIn ID, or company name.
Separate multiple job titles with "OR" to search for several roles at once (e.g. "CEO OR CTO OR CFO").`,
  instructions: [
    'Identify the company using at least one of: domain, linkedinId, or companyName.',
    'Use jobTitle to filter by role. Separate multiple titles with "OR".',
    'Enable fuzzy matching for broader results.'
  ],
  constraints: [
    'Returns up to 10 people per search.',
    'Costs 10 credits for a successful search, 1 credit if no results found.',
    'Rate limited to 10 requests per second.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobTitle: z
        .string()
        .optional()
        .describe('Job title filter. Separate multiple titles with "OR" (e.g. "CEO OR CTO")'),
      domain: z.string().optional().describe('Company domain (e.g. "algolia.com")'),
      linkedinId: z
        .string()
        .optional()
        .describe('Company LinkedIn ID (e.g. "1441", "2728700")'),
      companyName: z.string().optional().describe('Company name (e.g. "Algolia", "Ubisoft")'),
      country: z.string().optional().describe('Filter results by country name'),
      fuzzy: z
        .boolean()
        .optional()
        .default(false)
        .describe('Enable fuzzy matching for broader results')
    })
  )
  .output(
    z.object({
      people: z
        .array(z.any())
        .describe('List of matching people with their profile data and match scores'),
      totalFound: z.number().optional().describe('Number of people found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.findPeople({
      currentJobTitle: ctx.input.jobTitle,
      domain: ctx.input.domain,
      linkedinId: ctx.input.linkedinId,
      currentCompanies: ctx.input.companyName,
      countries: ctx.input.country,
      fuzzy: ctx.input.fuzzy
    });

    let people = result?.data || result?.persons || [];
    let companyLabel =
      ctx.input.companyName || ctx.input.domain || ctx.input.linkedinId || 'the company';

    return {
      output: {
        people: Array.isArray(people) ? people : [],
        totalFound: Array.isArray(people) ? people.length : 0
      },
      message: `Found **${Array.isArray(people) ? people.length : 0}** people${ctx.input.jobTitle ? ` matching "${ctx.input.jobTitle}"` : ''} at **${companyLabel}**.`
    };
  })
  .build();
