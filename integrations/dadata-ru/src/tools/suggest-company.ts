import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let companySuggestionSchema = z.object({
  value: z.string().describe('Short company name'),
  inn: z.string().nullable().describe('INN (taxpayer identification number)'),
  kpp: z.string().nullable().describe('KPP (tax registration reason code)'),
  ogrn: z.string().nullable().describe('OGRN (primary state registration number)'),
  type: z.string().nullable().describe('Entity type: LEGAL or INDIVIDUAL'),
  nameFullWithOpf: z.string().nullable().describe('Full name with legal form'),
  nameShort: z.string().nullable().describe('Short company name'),
  status: z
    .string()
    .nullable()
    .describe('Company status: ACTIVE, LIQUIDATED, LIQUIDATING, BANKRUPT, REORGANIZING'),
  registrationDate: z.string().nullable().describe('Registration date (timestamp)'),
  liquidationDate: z
    .string()
    .nullable()
    .describe('Liquidation date (timestamp) if applicable'),
  address: z.string().nullable().describe('Company address'),
  managementName: z.string().nullable().describe('CEO/head name'),
  managementPost: z.string().nullable().describe('CEO/head position title'),
  okved: z.string().nullable().describe('Primary OKVED code'),
  branchType: z.string().nullable().describe('MAIN or BRANCH'),
  branchCount: z.number().nullable().describe('Number of branches')
});

export let suggestCompany = SlateTool.create(spec, {
  name: 'Suggest Company',
  key: 'suggest_company',
  description: `Provides autocomplete suggestions for Russian companies and individual entrepreneurs. Search by company name, INN, OGRN, or CEO name.
Returns company details including INN, OGRN, address, management info, OKVED code, and status. Results can be filtered by entity type, status, OKVED, and region.`,
  instructions: [
    'Search by company name, INN, OGRN, or CEO name.',
    'Use type filter to search only legal entities ("LEGAL") or individual entrepreneurs ("INDIVIDUAL").',
    'Use status filter to find only active, liquidated, or bankrupt companies.'
  ],
  constraints: ['Maximum 20 results per request.', 'Query limited to 300 characters.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Company name, INN, OGRN, or CEO name'),
      count: z.number().optional().describe('Number of results (max 20, default 10)'),
      type: z.enum(['LEGAL', 'INDIVIDUAL']).optional().describe('Filter by entity type'),
      status: z
        .array(z.enum(['ACTIVE', 'LIQUIDATED', 'LIQUIDATING', 'BANKRUPT', 'REORGANIZING']))
        .optional()
        .describe('Filter by company status'),
      okved: z.array(z.string()).optional().describe('Filter by OKVED activity codes'),
      locations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Region constraints (e.g., [{"kladr_id": "77"}])'),
      locationsBoost: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Boost priority for specific regions')
    })
  )
  .output(
    z.object({
      suggestions: z.array(companySuggestionSchema).describe('List of company suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.suggestParty({
      query: ctx.input.query,
      count: ctx.input.count,
      type: ctx.input.type,
      status: ctx.input.status,
      okved: ctx.input.okved,
      locations: ctx.input.locations,
      locationsBoost: ctx.input.locationsBoost
    });

    let suggestions = (data.suggestions || []).map((s: any) => ({
      value: s.value || '',
      inn: s.data?.inn ?? null,
      kpp: s.data?.kpp ?? null,
      ogrn: s.data?.ogrn ?? null,
      type: s.data?.type ?? null,
      nameFullWithOpf: s.data?.name?.full_with_opf ?? null,
      nameShort: s.data?.name?.short ?? null,
      status: s.data?.state?.status ?? null,
      registrationDate:
        s.data?.state?.registration_date != null
          ? String(s.data.state.registration_date)
          : null,
      liquidationDate:
        s.data?.state?.liquidation_date != null ? String(s.data.state.liquidation_date) : null,
      address: s.data?.address?.value ?? null,
      managementName: s.data?.management?.name ?? null,
      managementPost: s.data?.management?.post ?? null,
      okved: s.data?.okved ?? null,
      branchType: s.data?.branch_type ?? null,
      branchCount: s.data?.branch_count ?? null
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** company suggestion(s) for "${ctx.input.query}".`
    };
  })
  .build();
