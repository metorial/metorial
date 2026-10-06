import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

const text = z.string().nullable().optional();
const number = z.number().finite().nullable().optional();
const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional();
const list = <T extends z.ZodType>(schema: T) =>
  z
    .array(schema)
    .nullish()
    .transform(value => value ?? []);
const email = z.object({
  email: z.string().optional(),
  smtp_valid: text,
  type: text,
  grade: text,
  last_validation_check: text
});
const phone = z.object({
  number: z.string().optional(),
  type: text,
  validity: text,
  recommended: z.boolean().optional(),
  premium: z.boolean().optional()
});
export const personSchema = z.object({
  id,
  status: z.string().optional(),
  name: text,
  current_title: text,
  current_employer: text,
  current_employer_domain: text,
  current_employer_industry: text,
  location: text,
  city: text,
  region: text,
  country_code: text,
  linkedin_url: text,
  profile_pic: text,
  recommended_email: text,
  recommended_professional_email: text,
  recommended_personal_email: text,
  current_work_email: text,
  current_personal_email: text,
  emails: list(email),
  phones: list(phone),
  skills: z.array(z.string()).nullable().optional(),
  job_history: list(
    z.object({
      title: text,
      company_name: text,
      company_domain: text,
      start_date: text,
      end_date: text,
      is_current: z.boolean().optional(),
      department: text
    })
  ),
  education: list(
    z.object({ school: text, degree: text, major: text, start: number, end: number })
  ),
  links: z.record(z.string(), z.unknown()).nullable().optional()
});
export const companySchema = z.object({
  id,
  name: text,
  email_domain: text,
  domain: text,
  website_url: text,
  ticker_symbol: text,
  industry_str: text,
  industry: z.unknown().optional(),
  num_employees: number,
  employee_count: number,
  revenue: z
    .union([z.string(), z.number().finite()])
    .nullable()
    .optional()
    .transform(value => (typeof value === 'number' ? String(value) : value)),
  city: text,
  region: text,
  country_code: text,
  description: text,
  founded: number,
  year_founded: number,
  linkedin_url: text,
  facebook_url: text,
  twitter_url: text,
  crunchbase_url: text,
  phone: text,
  fax: text,
  total_funding: number,
  latest_funding_round: text,
  latest_funding_date: text,
  techstack: z.array(z.string()).nullable().optional(),
  naics_code: text,
  sic_code: text,
  links: z.record(z.string(), z.unknown()).nullable().optional()
});
const credit = z.union([z.number().finite(), z.string(), z.null()]).optional();
export const accountSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  first_name: text,
  last_name: text,
  email: text,
  state: z.string().optional(),
  lookup_credit_balance: number,
  lifetime_credits_spent: number,
  plan: z.object({ id, name: text, lookup_limit: number }).optional(),
  credit_usage: list(
    z.object({
      credit_type: z.string().optional(),
      allocated: credit,
      used: z.number().finite().optional(),
      remaining: credit
    })
  ),
  rate_limits: list(
    z.object({
      action: z.string().optional(),
      duration: z.string().optional(),
      limit: number,
      used: z.number().finite().optional(),
      remaining: number
    })
  )
});
const paginationSchema = z.object({
  start: z.number().int().nonnegative().optional(),
  page_size: z.number().int().nonnegative().optional(),
  size: z.number().int().nonnegative().optional(),
  total: z.number().int().nonnegative().optional(),
  total_results: z.number().int().nonnegative().optional(),
  next: z.number().int().nonnegative().nullable().optional()
});
export const parseResponse = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'RocketReach returned an unexpected response. No request was retried; check account access and API availability.',
      { reason: 'invalid_response' }
    );
  return parsed.data;
};
export const parsePerson = (value: unknown, requireLookup = false) => {
  const profile = parseResponse(personSchema, value);
  if (
    (!profile.id && !profile.linkedin_url && !profile.name) ||
    (requireLookup && (!profile.id || !profile.status?.trim()))
  )
    throw createApiServiceError(
      'RocketReach returned a profile without the identity or lookup status needed to continue. Do not repeat enrichment automatically.',
      { reason: 'invalid_response' }
    );
  return profile;
};
export const parseCompany = (value: unknown) => {
  const company = parseResponse(companySchema, value);
  if (!company.id && !company.name && !company.email_domain && !company.domain)
    throw createApiServiceError('RocketReach returned a company without a usable identity.', {
      reason: 'invalid_response'
    });
  return company;
};
export const searchResponse = <T>(
  value: unknown,
  keys: string[],
  parse: (item: unknown) => T
) => {
  const envelope = isApiErrorRecord(value) ? value : undefined;
  const records = Array.isArray(value)
    ? value
    : keys.map(key => envelope?.[key]).find(Array.isArray);
  if (!Array.isArray(records))
    throw createApiServiceError('RocketReach returned an invalid search results collection.', {
      reason: 'invalid_response'
    });
  const pagination =
    envelope?.pagination === undefined
      ? undefined
      : parseResponse(paginationSchema, envelope.pagination);
  return {
    records: records.map(parse),
    pagination: {
      start: pagination?.start,
      pageSize: pagination?.page_size ?? pagination?.size,
      totalResults:
        pagination?.total ??
        pagination?.total_results ??
        (typeof envelope?.total === 'number' &&
        Number.isSafeInteger(envelope.total) &&
        envelope.total >= 0
          ? envelope.total
          : undefined),
      nextStart: pagination?.next
    }
  };
};
export const mapEmails = (profile: z.output<typeof personSchema>) =>
  profile.emails.map(value => ({
    email: value.email,
    smtpValid: value.smtp_valid,
    type: value.type,
    grade: value.grade,
    lastValidationCheck: value.last_validation_check
  }));
export const mapPhones = (profile: z.output<typeof personSchema>) =>
  profile.phones.map(value => ({
    number: value.number,
    type: value.type,
    validity: value.validity,
    recommended: value.recommended,
    premium: value.premium
  }));
