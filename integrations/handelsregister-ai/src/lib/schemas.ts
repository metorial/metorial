import { z } from 'zod';

export const recordSchema = z.record(z.string(), z.unknown());
export const metaSchema = z
  .object({
    request_credit_cost: z.number().nullish(),
    credits_remaining: z.union([z.number(), z.string()]).nullish()
  })
  .catchall(z.unknown());
export const companySchema = z
  .object({
    entity_id: z.string(),
    name: z.string(),
    status: z.string().nullish(),
    legal_form: z.string().nullish(),
    purpose: z.string().nullish(),
    registration_date: z.string().nullish(),
    address: recordSchema.nullish(),
    registration: z
      .object({
        court: z.string().nullish(),
        register_type: z.string().nullish(),
        register_number: z.union([z.string(), z.number()]).nullish()
      })
      .catchall(z.unknown())
      .nullish()
  })
  .catchall(z.unknown());
export const companyInputSchema = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Company name, register number, or entity_id from search_organizations. Prefer entity_id to distinguish companies with similar names.'
    ),
  ai_search: z
    .literal('on-default')
    .optional()
    .describe(
      'Enable AI-assisted company resolution for 20 additional credits, charged even if the request fails. Omit to leave it off.'
    ),
  realtime_mode: z
    .literal('handelsregister-default')
    .optional()
    .describe(
      'Fetch current register data for 10 additional credits on success. Incompatible with related persons and publications; omit for normal retrieval.'
    )
});
export const fileSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  sourceUrl: z.string().optional(),
  year: z.number().nullish(),
  document_type: z.string().nullish(),
  document_date: z.string().nullish(),
  document_title: z.string().nullish(),
  language: z.string().nullish()
});
export const personSchema = z
  .object({
    entity_id: z.string(),
    name: z.string(),
    birth_date: z.string().nullish(),
    bio: z.string().nullish(),
    handelsregister_roles: z.array(recordSchema).nullish(),
    affiliations: z.array(recordSchema).nullish(),
    shareholdings: recordSchema.nullish(),
    meta: metaSchema.optional()
  })
  .catchall(z.unknown());
export const accountSchema = z
  .object({
    id: z.union([z.string(), z.number()]).nullish(),
    name: z.string().nullish(),
    email: z.string().nullish(),
    language: z.string().nullish(),
    plan: z.union([z.string(), recordSchema]).nullish()
  })
  .catchall(z.unknown());
export const accountOutputSchema = z.object({
  account: accountSchema,
  meta: metaSchema.optional()
});
const rangeSchema = z.object({
  gte: z.number().optional().describe('Inclusive minimum.'),
  lte: z.number().optional().describe('Inclusive maximum.')
});
const stringList = z.union([z.string(), z.array(z.string()).min(1)]);
export const searchFiltersSchema = z
  .object({
    registration_date_from: z.iso
      .date()
      .optional()
      .describe('Earliest registration date, YYYY-MM-DD.'),
    registration_date_to: z.iso
      .date()
      .optional()
      .describe('Latest registration date, YYYY-MM-DD.'),
    legal_form_code: z.string().optional().describe('One legal form, for example GmbH or AG.'),
    industry_code: stringList
      .optional()
      .describe('One industry code or a list matching any code.'),
    industry_scheme: z
      .string()
      .optional()
      .describe('Industry classification scheme; provider defaults to WZ2025.'),
    active: z
      .boolean()
      .optional()
      .describe('True for active, false for inactive; omit for both.'),
    status: z
      .enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'DISSOLVED', 'INSOLVENT'])
      .optional()
      .describe('Exact register status.'),
    legal_form_liability_type: z
      .enum(['limited', 'unlimited', 'mixed'])
      .optional()
      .describe('Liability model.'),
    postal_code: z
      .string()
      .regex(/^\d{5}$/)
      .optional()
      .describe('German five-digit postal code.'),
    city: z.string().optional().describe('City name.'),
    state: z.string().optional().describe('German federal state.'),
    location_coordinates: z
      .object({
        lat: z.number().min(-90).max(90).describe('WGS84 latitude.'),
        lon: z.number().min(-180).max(180).describe('WGS84 longitude.')
      })
      .optional()
      .describe('Radius-search center; also supply location_max_distance_km.'),
    location_max_distance_km: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe('Radius in kilometres; requires location_coordinates.'),
    registration_type: stringList
      .optional()
      .describe('Register type or types: HRA, HRB, GnR, PR, VR.'),
    registration_authority_name: z
      .string()
      .optional()
      .describe('Register court, for example München.'),
    registration_number: z
      .string()
      .optional()
      .describe('Register number, for example HRB 12345.'),
    company_size_category: z
      .enum(['micro', 'small', 'medium', 'large'])
      .optional()
      .describe('Company size category.'),
    financial_filters: z
      .object({
        emp_count: rangeSchema.optional().describe('Employee count range.'),
        bs_assets_total: rangeSchema.optional().describe('Total assets in EUR.'),
        bs_equity_total: rangeSchema.optional().describe('Equity in EUR.'),
        bs_liabilities_total: rangeSchema.optional().describe('Liabilities in EUR.'),
        bs_cash_and_equivalents: rangeSchema
          .optional()
          .describe('Cash and equivalents in EUR.'),
        bs_cash_to_liabilities: rangeSchema
          .optional()
          .describe('Cash divided by liabilities.'),
        bs_equity_ratio: rangeSchema.optional().describe('Equity divided by total assets.'),
        bs_debt_to_assets: rangeSchema.optional().describe('Debt divided by assets.'),
        pl_revenue: rangeSchema.optional().describe('Revenue in EUR.'),
        pl_net_income: rangeSchema.optional().describe('Net income in EUR.'),
        pl_ebit: rangeSchema.optional().describe('EBIT in EUR.')
      })
      .catchall(z.unknown())
      .optional()
      .describe(
        'Financial ranges nested under provider financial_filters; each uses gte/lte.'
      ),
    ownership_filters: recordSchema
      .optional()
      .describe(
        'Provider ownership criteria, such as structure, owner_managed, likely_family_owned, and largest_share_ratio.'
      ),
    executive_filters: recordSchema
      .optional()
      .describe(
        'Provider executive criteria, such as md_oldest_birth_date and md_youngest_birth_date.'
      ),
    lifecycle_filters: recordSchema
      .optional()
      .describe(
        'Provider lifecycle criteria, such as insolvency_active, insolvency_status, and insolvency_opened_date.'
      )
  })
  .catchall(z.unknown());
export const searchInputSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2)
    .max(500)
    .optional()
    .describe('Company search text. Required unless filters contains at least one criterion.'),
  skip: z
    .number()
    .int()
    .nonnegative()
    .default(0)
    .describe('Results to skip; increment for the next page.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(10)
    .describe('Results per page, maximum 30. Each page is a separate billed request.'),
  filters: searchFiltersSchema
    .optional()
    .describe('Structured provider search filters. Encoded as JSON in the REST request.'),
  sort: z
    .enum([
      'relevance',
      'registration_date',
      'financial_year',
      'revenue',
      'profit',
      'employees',
      'total_assets',
      'equity',
      'liabilities',
      'cash',
      'equity_ratio',
      'share_capital',
      'last_activity',
      'largest_share_ratio',
      'management_size',
      'md_oldest_birth_date',
      'md_youngest_birth_date',
      'fb_entity_id',
      'distance'
    ])
    .optional()
    .describe('Sort field. distance requires a radius-search location.'),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Sort direction; omit for the provider default.'),
  match_context: z
    .boolean()
    .optional()
    .describe('Include which register-derived criteria matched each hit.')
});
export const searchOutputSchema = z.object({
  results: z.array(companySchema),
  total: z.number().int().nonnegative(),
  skip: z.number().int(),
  limit: z.number().int(),
  next_skip: z.number().int().optional(),
  meta: metaSchema.optional()
});
export const documentInputSchema = z.object({
  company_id: z
    .string()
    .trim()
    .min(1)
    .describe(
      'Company entity_id. Call search_organizations to discover the exact company ID.'
    ),
  document_type: z
    .enum(['AD', 'CD', 'shareholders_list', 'articles_of_association', 'SI'])
    .describe(
      'AD: current excerpt; CD: chronological excerpt; shareholders_list; articles_of_association; SI: structured XML. All other types return PDF.'
    )
});

export const financialKpiSchema = z
  .object({
    year: z.number(),
    revenue: z.number().nullish(),
    net_income: z.number().nullish(),
    employees: z.number().nullish(),
    active_total: z.number().nullish()
  })
  .catchall(z.unknown());
export const annualStatementSchema = z
  .object({
    year: z.number().nullish(),
    document_type: z.string().nullish(),
    document_date: z.string().nullish(),
    document_title: z.string().nullish(),
    language: z.string().nullish(),
    document_md: z.string().nullish(),
    document_html: z.string().nullish()
  })
  .catchall(z.unknown());
