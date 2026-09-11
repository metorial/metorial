import { createApiServiceError } from 'slates';
import type { z } from 'zod';
import { companySchema } from './schemas';

export function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  let parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Handelsregister.ai returned an unexpected response format. Try again later.',
      { reason: 'handelsregister_response_error' }
    );
  return parsed.data;
}

const featureFields = [
  'financial_kpi',
  'balance_sheet_accounts',
  'profit_and_loss_account',
  'related_persons',
  'publications',
  'history',
  'news',
  'insolvency_publications',
  'annual_financial_statements',
  'annual_financial_statements__html',
  'annual_financial_statements_html',
  'shareholders',
  'ubos',
  'shareholdings',
  'mergers_and_acquisitions',
  'network',
  'website_content',
  'meta'
];

export function baseCompany(response: Record<string, unknown>) {
  let company = { ...response };
  for (let field of featureFields) delete company[field];
  return parseResponse(companySchema, company);
}
