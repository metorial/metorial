import { createApiServiceError } from 'slates';
import { z } from 'zod';

const text = z.string().trim().min(1);
const filterShape = {
  value: text
    .optional()
    .describe(
      'Exact match. Monetary values are cents; booleans are "true" or "false" strings; dates accept YYYY-MM-DD.'
    ),
  values: z
    .array(text)
    .min(1)
    .optional()
    .describe(
      'Match any exact value within this field (OR). Cannot combine with other filter forms.'
    ),
  keywords: z
    .array(text)
    .min(1)
    .optional()
    .describe(
      'Match any contained keyword in a text field, such as purpose or address. Cannot combine with other filter forms.'
    ),
  min: text
    .optional()
    .describe(
      'Inclusive lower bound. Numbers as strings; monetary values in cents; dates accept YYYY-MM-DD. May combine only with max.'
    ),
  max: text
    .optional()
    .describe('Inclusive upper bound, with the same units as min. May combine only with min.')
};

const query = z
  .object({
    value: text.describe(
      'Free-text query, such as a company name, person name, or insolvency case number.'
    )
  })
  .optional()
  .describe('Optional free-text search combined with filters.');
const pagination = z
  .object({
    page: z.number().int().min(1).optional().describe('Page number, starting at 1.'),
    per_page: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Results per page. Provider limits apply.')
  })
  .optional()
  .describe('Retrieve one page; use response pagination to request subsequent pages.');

export const companyId = text.describe(
  'Company ID returned by search_companies, search_companies_advanced, or lookup_company_by_url.'
);
export const companyInput = z.object({ company_id: companyId });
export const personInput = z.object({
  person_id: text.describe(
    'Person ID returned by search_people or a natural-person representative from get_company.'
  )
});
export const realtime = z
  .boolean()
  .optional()
  .describe(
    'Fetch fresh Handelsregister data instead of cached data. Defaults to false; costs additional credits and takes longer.'
  );

export const companyDetailsInput = companyInput.extend({
  realtime,
  export: z
    .boolean()
    .optional()
    .describe(
      'Return company information without sources. This does not generate a downloadable export.'
    )
});
export const ownersInput = companyInput.extend({
  realtime,
  export: z
    .boolean()
    .optional()
    .describe(
      'Return already processed owners only; skip processing documents that have not been processed yet.'
    ),
  best_available: z
    .boolean()
    .optional()
    .describe(
      'Allow the best available AG/SE ownership data, which may be historical. Without this flag AG/SE requests return 404. Cannot combine with realtime=true.'
    )
});

export const realtimeCategories = [
  'current_printout',
  'chronological_printout',
  'historical_printout',
  'structured_information',
  'shareholder_list',
  'articles_of_association'
] as const;
export const realtimeDocumentInput = companyInput.extend({
  document_category: z
    .enum(realtimeCategories)
    .describe(
      'Official document category. structured_information produces XML; other categories produce PDF.'
    )
});

export const companyFields = [
  'status',
  'legal_form',
  'register_number',
  'register_court',
  'register_type',
  'city',
  'active',
  'incorporated_at',
  'zip',
  'address',
  'balance_sheet_total',
  'revenue',
  'cash',
  'employees',
  'equity',
  'real_estate',
  'materials',
  'pension_provisions',
  'salaries',
  'taxes',
  'other_taxes',
  'commission_income',
  'commission_expense',
  'liabilities',
  'capital_reserves',
  'active_accruals',
  'passive_accruals',
  'fixed_assets',
  'current_assets',
  'receivables',
  'trade_receivables',
  'inventory',
  'provisions',
  'bank_debt',
  'trade_payables',
  'tangible_assets',
  'financial_assets',
  'retained_earnings',
  'profit_carryforward',
  'other_provisions',
  'shareholder_liabilities',
  'operating_depreciation',
  'financial_depreciation',
  'other_operating_income',
  'interest_income',
  'interest_expense',
  'other_liabilities',
  'financial_debt',
  'intangible_assets',
  'other_operating_expenses',
  'affiliated_liabilities',
  'net_income',
  'parent_net_income',
  'income_before_tax',
  'income_after_tax',
  'ebit',
  'ebitda',
  'industry_codes',
  'capital_amount',
  'capital_currency',
  'number_of_owners',
  'has_sole_owner',
  'has_representative_owner',
  'is_family_owned',
  'youngest_owner_age',
  'purpose',
  'has_lei',
  'lei',
  'had_insolvency',
  'has_open_insolvency',
  'insolvency_stage',
  'insolvency_opened_at',
  'estimated_revenue',
  'estimated_revenue_confidence',
  'estimated_ebitda',
  'estimated_ebitda_confidence',
  'vat_id'
] as const;

export const personFields = ['date_of_birth', 'city', 'active'] as const;

export const insolvencyFields = [
  'debtor_kind',
  'debtor_legal_form',
  'court',
  'city',
  'current_status',
  'has_open_insolvency',
  'proceeding_kind',
  'administration_kind',
  'insolvency_grounds',
  'opened_at',
  'closed_at',
  'last_event_at',
  'claims_filing_deadline',
  'company_id',
  'person_id'
] as const;

export const advancedCompanyInput = z.object({
  query,
  filters: z
    .array(
      z.object({
        field: z
          .enum(companyFields)
          .describe(
            'Company field to filter. Estimated financial filters include reported figures when available; revenue/ebitda filter reported figures only.'
          ),
        ...filterShape
      })
    )
    .optional()
    .describe(
      'Conditions combined with AND; choose exactly one of value, values, keywords, or min/max for each condition.'
    ),
  pagination,
  location: z
    .object({
      latitude: z.number().min(-90).max(90).describe('Latitude of the search center.'),
      longitude: z.number().min(-180).max(180).describe('Longitude of the search center.'),
      radius: z.number().positive().optional().describe('Search radius in kilometers.')
    })
    .optional()
    .describe('Optional geographic search area.')
});
export const personSearchInput = z.object({
  query,
  filters: z
    .array(
      z.object({
        field: z.enum(personFields).describe('Person field to filter.'),
        ...filterShape
      })
    )
    .optional()
    .describe('Conditions combined with AND; one filter form per condition.'),
  pagination
});
export const insolvencySearchInput = z.object({
  query: query.describe('Free-text search. Required when no filters are provided.'),
  filters: z
    .array(
      z.object({
        field: z
          .enum(insolvencyFields)
          .describe(
            'Insolvency field to filter. company_id and person_id link proceedings to discovered entities.'
          ),
        ...filterShape
      })
    )
    .optional()
    .describe(
      'Conditions combined with AND; one filter form per condition. Provide at least one filter when no query is provided.'
    ),
  pagination
});

type Filter =
  | Array<{
      field: string;
      value?: string;
      values?: string[];
      keywords?: string[];
      min?: string;
      max?: string;
    }>
  | undefined;
export const validateFilters = (filters: Filter) => {
  for (const filter of filters ?? []) {
    const forms = [
      filter.value !== undefined,
      filter.values !== undefined,
      filter.keywords !== undefined,
      filter.min !== undefined || filter.max !== undefined
    ].filter(Boolean).length;
    if (forms !== 1)
      throw createApiServiceError(
        `Filter "${filter.field}" requires exactly one of value, values, keywords, or min/max.`,
        { reason: 'openregister_invalid_filter' }
      );
    const booleanFields = [
      'active',
      'has_sole_owner',
      'has_representative_owner',
      'is_family_owned',
      'has_lei',
      'had_insolvency',
      'has_open_insolvency'
    ];
    if (booleanFields.includes(filter.field)) {
      const values = filter.value !== undefined ? [filter.value] : filter.values;
      if (!values || values.some(value => value !== 'true' && value !== 'false'))
        throw createApiServiceError(
          `Filter "${filter.field}" accepts value or values containing "true" or "false" strings.`
        );
    }
    if (filter.field.endsWith('_confidence')) {
      const values = filter.value !== undefined ? [filter.value] : filter.values;
      if (!values || values.some(value => !['high', 'medium', 'low'].includes(value)))
        throw createApiServiceError(
          `Filter "${filter.field}" accepts high, medium, or low using value or values.`
        );
    }
  }
};
