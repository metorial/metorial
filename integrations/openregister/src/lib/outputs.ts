import { z } from 'zod';
import { realtimeCategories } from './inputs';

const nullableText = z.string().nullable();
const source = z.looseObject({ document_url: z.string() });
const address = z.looseObject({
  city: z.string(),
  country: z.string(),
  formatted_value: z.string(),
  postal_code: z.string().optional(),
  street: z.string().optional(),
  start_date: z.string().optional()
});
const register = z.looseObject({
  register_court: z.string(),
  register_number: z.string(),
  register_type: z.string(),
  company_id: z.string().optional(),
  start_date: z.string().optional()
});
const companyName = z.looseObject({
  name: z.string(),
  legal_form: z.string(),
  start_date: z.string()
});
const capital = z.looseObject({
  amount: z.number(),
  currency: z.string(),
  start_date: z.string()
});
const purpose = z.looseObject({ purpose: z.string(), start_date: z.string() });
const contact = z.looseObject({
  website_url: z.string(),
  social_media: z.record(z.string(), z.string()),
  email: z.string().optional(),
  phone: z.string().optional(),
  vat_id: z.string().optional()
});
const companyRelation = z.looseObject({
  company_id: z.string(),
  name: z.string(),
  agreement_date: nullableText,
  registration_date: z.string()
});
const naturalPerson = z.looseObject({
  first_name: nullableText.optional(),
  last_name: nullableText.optional(),
  full_name: z.string().optional(),
  city: nullableText,
  date_of_birth: nullableText,
  country: z.string().optional()
});
const legalPerson = z.looseObject({
  name: z.string(),
  city: nullableText,
  country: z.string()
});
const documentMetadata = z.looseObject({
  id: z.string(),
  date: z.string(),
  latest: z.boolean(),
  type: z.string()
});
const representation = z.looseObject({
  id: nullableText,
  name: z.string(),
  role: z.string(),
  type: z.string(),
  start_date: z.string(),
  end_date: nullableText,
  authority: nullableText,
  natural_person: naturalPerson.nullish(),
  legal_person: legalPerson.nullish()
});
const indicator = z
  .looseObject({
    date: z.string(),
    report_id: z.string(),
    revenue: z.number().nullish(),
    ebitda: z.number().nullish(),
    employees: z.number().nullish(),
    balance_sheet_total: z.number().nullish(),
    net_income: z.number().nullish(),
    equity: z.number().nullish()
  })
  .describe(
    'Financial monetary indicators retain provider values in cents; employees is a count. Additional provider estimate fields retain their original names and structure, separate from reported figures.'
  );

export const paginationOutput = z.object({
  page: z.number(),
  per_page: z.number(),
  total_pages: z.number(),
  total_results: z.number()
});
export const companySearchRecord = z.looseObject({
  company_id: z.string(),
  name: z.string(),
  active: z.boolean(),
  address: address.nullable(),
  country: nullableText,
  legal_form: z.string(),
  purpose: nullableText,
  register_court: z.string(),
  register_number: z.string(),
  register_type: z.string()
});
export const companySearchOutput = z.object({ results: z.array(companySearchRecord) });
export const advancedCompanyOutput = companySearchOutput.extend({
  pagination: paginationOutput
});
export const personSearchOutput = z.object({
  results: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      active: z.boolean(),
      city: nullableText,
      date_of_birth: nullableText
    })
  ),
  pagination: paginationOutput
});
export const lookupOutput = z.looseObject({
  company_id: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  vat_id: z.string().optional()
});
export const contactOutput = z.looseObject({
  source_url: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  vat_id: z.string().optional()
});

export const companyOutput = z.looseObject({
  id: z.string(),
  name: companyName,
  names: z.array(companyName),
  legal_form: z.string(),
  status: z.string(),
  address,
  addresses: z.array(address),
  register,
  registers: z.array(register),
  capital: capital.nullable(),
  capitals: z.array(capital),
  purpose: purpose.nullable(),
  purposes: z.array(purpose),
  incorporated_at: z.string(),
  notarized_at: nullableText,
  terminated_at: nullableText,
  representation: z.array(representation),
  representation_rule: nullableText,
  documents: z.array(documentMetadata),
  sources: z.array(source).optional(),
  contact: contact.nullable(),
  indicators: z.array(indicator),
  industry_codes: z.looseObject({ WZ2025: z.array(z.looseObject({ code: z.string() })) }),
  acquisitions: z.array(companyRelation),
  asset_spin_offs: z.array(companyRelation),
  merged_into: companyRelation.nullable(),
  profit_transfer_agreement: companyRelation.nullable(),
  lei: z.string().optional()
});

const holding = z.looseObject({
  company_id: z.string(),
  name: z.string(),
  nominal_share: z.number(),
  percentage_share: z.number().nullable(),
  relation_type: z.string(),
  start: nullableText,
  end: nullableText
});
export const companyHoldingsOutput = z.looseObject({
  company_id: z.string(),
  holdings: z.array(holding)
});
export const personHoldingsOutput = z.looseObject({
  person_id: z.string(),
  holdings: z.array(holding)
});
export const ownersOutput = z.looseObject({
  company_id: z.string(),
  best_available: z.boolean(),
  sources: z.array(source).optional(),
  owners: z.array(
    z.looseObject({
      id: nullableText,
      name: z.string(),
      type: z.string(),
      natural_person: naturalPerson.nullable(),
      legal_person: legalPerson.nullable(),
      nominal_share: z.number(),
      percentage_share: z.number().nullable(),
      relation_type: z.string(),
      start: nullableText
    })
  )
});
export const historicalOwnersOutput = z.looseObject({
  owners: z.array(
    z.looseObject({
      id: z.string(),
      name: z.string(),
      entity_type: z.string(),
      first_appearance: z.string(),
      last_appearance: z.string().nullish(),
      status: z.string(),
      country: z.string().optional(),
      ownership_history: z.array(
        z.looseObject({
          document_id: z.string(),
          document_date: z.string(),
          nominal_shares: z.number(),
          percentage_shares: z.number()
        })
      )
    })
  )
});
export const ubosOutput = z.looseObject({
  company_id: z.string(),
  ubos: z.array(
    z.looseObject({
      id: nullableText,
      name: z.string(),
      natural_person: naturalPerson.nullable(),
      legal_person: legalPerson.nullable(),
      percentage_share: z.number().nullable(),
      max_percentage_share: z.number().nullable()
    })
  )
});

// Financial tables are recursive; preserve every accounting row and provider unit.
interface ReportRow {
  name: string;
  formatted_name: string;
  current_value: number | null;
  previous_value: number | null;
  children: ReportRow[];
}
const reportRow: z.ZodType<ReportRow> = z.lazy(() =>
  z.looseObject({
    name: z.string(),
    formatted_name: z.string(),
    current_value: z.number().nullable(),
    previous_value: z.number().nullable(),
    children: z.array(reportRow)
  })
);
interface MergedRow {
  name: string;
  formatted_name: string;
  values: Record<string, number>;
  children: MergedRow[];
}
const mergedRow: z.ZodType<MergedRow> = z.lazy(() =>
  z.looseObject({
    name: z.string(),
    formatted_name: z.string(),
    values: z.record(z.string(), z.number()),
    children: z.array(mergedRow)
  })
);
const table = z.looseObject({ rows: z.array(reportRow) });
const mergedTable = z.looseObject({ rows: z.array(mergedRow) });
export const financialsOutput = z.looseObject({
  indicators: z.array(indicator),
  reports: z.array(
    z.looseObject({
      report_id: z.string(),
      report_start_date: nullableText,
      report_end_date: z.string(),
      consolidated: z.boolean(),
      sources: z.array(z.looseObject({ html_url: z.string() })),
      aktiva: table,
      passiva: table,
      guv: table.nullish()
    })
  ),
  merged: z
    .looseObject({ aktiva: mergedTable, passiva: mergedTable, guv: mergedTable.optional() })
    .nullable()
});
export const personOutput = z.looseObject({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  city: z.string(),
  date_of_birth: nullableText,
  age: z.number().nullable(),
  management_positions: z.array(
    z.looseObject({
      company_name: z.string(),
      register_id: z.string(),
      role: z.string(),
      start_date: z.string(),
      end_date: z.string().optional()
    })
  )
});

const insolvencyRecord = z.looseObject({
  id: z.string(),
  debtor_name: z.string(),
  case_number: z.string(),
  court: z.string(),
  current_status: z.string(),
  company_id: nullableText,
  person_id: nullableText.optional(),
  administrator_name: nullableText.optional(),
  opened_at: nullableText.optional(),
  closed_at: nullableText.optional(),
  last_event_at: nullableText.optional()
});
export const insolvencySearchOutput = z.object({
  results: z.array(insolvencyRecord.extend({ has_open_insolvency: z.boolean() })),
  pagination: paginationOutput
});
export const insolvencyOutput = insolvencyRecord.extend({
  insolvency_grounds: z.array(z.string()),
  events: z.array(
    z.looseObject({
      id: z.string(),
      event_type: z.string(),
      report_type: z.string(),
      summary: z.string(),
      published_at: z.string(),
      decision_date: nullableText.optional(),
      effective_at: nullableText.optional(),
      details: z.looseObject({
        insolvency_grounds: z.array(z.string()),
        meetings: z.array(
          z.looseObject({
            kind: z.string(),
            at: nullableText.optional(),
            location: nullableText.optional()
          })
        )
      })
    })
  )
});
export const storedDocumentOutput = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  type: z.string(),
  url: z.url().describe('Direct download URL; valid for 15 minutes after this request.')
});
export const realtimeDocumentOutput = z.object({
  url: z.url().describe('Direct provider download URL.'),
  category: z.enum(realtimeCategories),
  file_date: nullableText,
  file_name: nullableText
});
export const creditsOutput = z.object({
  included_credits: z.number(),
  used_credits: z.number(),
  remaining_credits: z.number(),
  overage_credits: z.number(),
  paid: z.boolean(),
  period: z.object({
    reset_at: z.string(),
    type: z.enum(['billing_cycle', 'rolling_30_days'])
  })
});
