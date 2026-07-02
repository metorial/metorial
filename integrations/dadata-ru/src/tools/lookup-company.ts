import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let companyDetailSchema = z.object({
  value: z.string().describe('Short company name'),
  inn: z.string().nullable().describe('INN'),
  kpp: z.string().nullable().describe('KPP'),
  ogrn: z.string().nullable().describe('OGRN'),
  ogrnDate: z.string().nullable().describe('OGRN registration date (timestamp)'),
  type: z.string().nullable().describe('LEGAL or INDIVIDUAL'),
  nameFullWithOpf: z.string().nullable().describe('Full name with legal form'),
  nameShortWithOpf: z.string().nullable().describe('Short name with legal form'),
  nameFull: z.string().nullable().describe('Full name'),
  nameShort: z.string().nullable().describe('Short name'),
  opfCode: z.string().nullable().describe('Legal form code'),
  opfFull: z.string().nullable().describe('Full legal form name'),
  opfShort: z.string().nullable().describe('Short legal form name'),
  status: z.string().nullable().describe('Company status'),
  registrationDate: z.string().nullable().describe('Registration date (timestamp)'),
  liquidationDate: z.string().nullable().describe('Liquidation date (timestamp)'),
  address: z.string().nullable().describe('Company address'),
  managementName: z.string().nullable().describe('CEO/head name'),
  managementPost: z.string().nullable().describe('CEO/head position title'),
  branchType: z.string().nullable().describe('MAIN or BRANCH'),
  branchCount: z.number().nullable().describe('Number of branches'),
  okved: z.string().nullable().describe('Primary OKVED code'),
  okvedType: z.string().nullable().describe('OKVED version (e.g., 2014)'),
  okato: z.string().nullable().describe('OKATO code'),
  oktmo: z.string().nullable().describe('OKTMO code'),
  okpo: z.string().nullable().describe('OKPO code'),
  okfs: z.string().nullable().describe('Ownership form code'),
  financeYear: z.number().nullable().describe('Most recent financial report year'),
  financeIncome: z.number().nullable().describe('Income from financial reports'),
  financeExpense: z.number().nullable().describe('Expenses from financial reports'),
  employeeCount: z.number().nullable().describe('Number of employees')
});

export let lookupCompany = SlateTool.create(spec, {
  name: 'Lookup Company',
  key: 'lookup_company',
  description: `Looks up detailed company information by INN, OGRN, or INN+KPP. Returns comprehensive data including name, address, management, financials, OKVED codes, branch info, and registration details.
Use this for precise lookups when you have a specific identifier, as opposed to the suggestion tool which is for fuzzy search.`,
  instructions: [
    'Provide an INN (10 digits for legal entities, 12 for individuals) or OGRN (13 or 15 digits).',
    'Use kpp to find a specific branch when searching by INN.',
    'Use branchType to filter for MAIN office or BRANCH only.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('INN, OGRN, or INN+KPP of the company'),
      kpp: z.string().optional().describe('KPP to find a specific branch'),
      branchType: z.enum(['MAIN', 'BRANCH']).optional().describe('Filter by branch type'),
      type: z.enum(['LEGAL', 'INDIVIDUAL']).optional().describe('Filter by entity type'),
      count: z.number().optional().describe('Number of results (max 20)')
    })
  )
  .output(
    z.object({
      companies: z.array(companyDetailSchema).describe('List of matched companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.findById('party', {
      query: ctx.input.query,
      kpp: ctx.input.kpp,
      branchType: ctx.input.branchType,
      type: ctx.input.type,
      count: ctx.input.count
    });

    let companies = (data.suggestions || []).map((s: any) => ({
      value: s.value || '',
      inn: s.data?.inn ?? null,
      kpp: s.data?.kpp ?? null,
      ogrn: s.data?.ogrn ?? null,
      ogrnDate: s.data?.ogrn_date != null ? String(s.data.ogrn_date) : null,
      type: s.data?.type ?? null,
      nameFullWithOpf: s.data?.name?.full_with_opf ?? null,
      nameShortWithOpf: s.data?.name?.short_with_opf ?? null,
      nameFull: s.data?.name?.full ?? null,
      nameShort: s.data?.name?.short ?? null,
      opfCode: s.data?.opf?.code ?? null,
      opfFull: s.data?.opf?.full ?? null,
      opfShort: s.data?.opf?.short ?? null,
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
      branchType: s.data?.branch_type ?? null,
      branchCount: s.data?.branch_count ?? null,
      okved: s.data?.okved ?? null,
      okvedType: s.data?.okved_type ?? null,
      okato: s.data?.okato ?? null,
      oktmo: s.data?.oktmo ?? null,
      okpo: s.data?.okpo ?? null,
      okfs: s.data?.okfs ?? null,
      financeYear: s.data?.finance?.year ?? null,
      financeIncome: s.data?.finance?.income ?? null,
      financeExpense: s.data?.finance?.expense ?? null,
      employeeCount: s.data?.employee_count ?? null
    }));

    return {
      output: { companies },
      message:
        companies.length > 0
          ? `Found **${companies.length}** company/companies for "${ctx.input.query}": ${companies.map((c: any) => c.value).join(', ')}`
          : `No companies found for "${ctx.input.query}".`
    };
  })
  .build();
