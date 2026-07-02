import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let affiliatedCompanySchema = z.object({
  value: z.string().describe('Company name'),
  inn: z.string().nullable().describe('INN'),
  ogrn: z.string().nullable().describe('OGRN'),
  type: z.string().nullable().describe('LEGAL or INDIVIDUAL'),
  status: z.string().nullable().describe('Company status'),
  address: z.string().nullable().describe('Company address'),
  okved: z.string().nullable().describe('Primary OKVED code')
});

export let findAffiliatedCompanies = SlateTool.create(spec, {
  name: 'Find Affiliated Companies',
  key: 'find_affiliated_companies',
  description: `Finds companies affiliated with a person or organization by INN. Returns companies where the given INN appears as a founder or manager.
Useful for discovering business relationships and corporate structures.`,
  instructions: [
    'Provide the INN of a person or organization to find their affiliated companies.',
    'Use scope to search among FOUNDERS, MANAGERS, or both.'
  ],
  constraints: [
    'Maximum 300 results per request.',
    'Requires "Maksimalny" (Maximum) subscription tier.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inn: z.string().describe('INN of the person or organization to search affiliations for'),
      count: z.number().optional().describe('Number of results (max 300, default 10)'),
      scope: z
        .array(z.enum(['FOUNDERS', 'MANAGERS']))
        .optional()
        .describe('Search scope: among founders, managers, or both (default both)')
    })
  )
  .output(
    z.object({
      affiliatedCompanies: z
        .array(affiliatedCompanySchema)
        .describe('List of affiliated companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.findAffiliated({
      query: ctx.input.inn,
      count: ctx.input.count,
      scope: ctx.input.scope
    });

    let affiliatedCompanies = (data.suggestions || []).map((s: any) => ({
      value: s.value || '',
      inn: s.data?.inn ?? null,
      ogrn: s.data?.ogrn ?? null,
      type: s.data?.type ?? null,
      status: s.data?.state?.status ?? null,
      address: s.data?.address?.value ?? null,
      okved: s.data?.okved ?? null
    }));

    return {
      output: { affiliatedCompanies },
      message: `Found **${affiliatedCompanies.length}** affiliated company/companies for INN "${ctx.input.inn}".`
    };
  })
  .build();
