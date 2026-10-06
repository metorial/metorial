import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const parse = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  const result = schema.safeParse(value);
  if (!result.success) throw createApiServiceError('Mode returned an invalid API response.');
  return result.data;
};
const string = z
  .string()
  .nullish()
  .transform(value => value ?? '');
const number = z
  .union([z.number(), z.string().regex(/^\d*$/)])
  .nullish()
  .transform(value =>
    value === undefined || value === null || value === '' ? 0 : Number(value)
  )
  .pipe(z.number().int().nonnegative().refine(Number.isSafeInteger));
const common = z.object({
  token: z.string().min(1),
  name: z.string(),
  description: string,
  created_at: string,
  updated_at: string
});
const links = z.record(
  z.string(),
  z.object({ href: z.string(), templated: z.boolean().optional() }).optional()
);
const base = (raw: z.infer<typeof common>) => ({
  name: raw.name,
  description: raw.description,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});
export const normalizeAccount = (raw: unknown) => {
  const value = parse(
    z.object({
      username: z.string().min(1),
      name: z.string(),
      id: z.number().int().positive(),
      token: z.string().min(1),
      user: z.boolean()
    }),
    raw
  );
  return {
    accountName: value.username,
    accountId: value.id,
    accountToken: value.token,
    name: value.name,
    userAccount: value.user
  };
};
export const normalizeReport = (raw: unknown) => {
  const value = parse(
    common.extend({
      archived: z.boolean(),
      space_token: string,
      last_successfully_run_at: string
    }),
    raw
  );
  return {
    reportToken: value.token,
    ...base(value),
    archived: value.archived,
    spaceToken: value.space_token,
    lastRunAt: value.last_successfully_run_at
  };
};
export const normalizeQuery = (raw: unknown) => {
  const value = parse(
    common.extend({ raw_query: string, data_source_id: number.pipe(z.number().positive()) }),
    raw
  );
  return {
    queryToken: value.token,
    name: value.name,
    rawQuery: value.raw_query,
    dataSourceId: value.data_source_id,
    createdAt: value.created_at,
    updatedAt: value.updated_at
  };
};
export const normalizeReportRun = (raw: unknown) => {
  const value = parse(
    z.object({
      token: z.string().min(1),
      state: z.string().min(1),
      python_state: string,
      created_at: string,
      updated_at: string,
      completed_at: string,
      parameters: z
        .record(z.string(), z.unknown())
        .nullish()
        .transform(value => value ?? {})
    }),
    raw
  );
  return {
    runToken: value.token,
    state: value.state,
    pythonState: value.python_state,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
    completedAt: value.completed_at,
    parameters: value.parameters
  };
};
export const normalizeQueryRun = (raw: unknown) => {
  const value = parse(
    z.object({
      token: z.string().min(1),
      state: z.string().min(1),
      query_token: z.string().min(1),
      query_name: string,
      raw_source: string,
      created_at: string,
      completed_at: string,
      data_source_id: number.pipe(z.number().positive())
    }),
    raw
  );
  return {
    queryRunToken: value.token,
    state: value.state,
    queryToken: value.query_token,
    queryName: value.query_name,
    rawSource: value.raw_source,
    createdAt: value.created_at,
    completedAt: value.completed_at,
    dataSourceId: value.data_source_id
  };
};
export const normalizeCollection = (raw: unknown) => {
  const value = parse(
    common.extend({
      space_type: string,
      state: string,
      restricted: z.boolean(),
      free_default: z
        .boolean()
        .nullish()
        .transform(value => value ?? false)
    }),
    raw
  );
  return {
    collectionToken: value.token,
    ...base(value),
    spaceType: value.space_type,
    state: value.state,
    restricted: value.restricted,
    freeDefault: value.free_default
  };
};
export const normalizeDataset = (raw: unknown) => {
  const value = parse(common, raw);
  return { datasetToken: value.token, ...base(value) };
};
export const normalizeDataSource = (raw: unknown) => {
  const value = parse(
    common.extend({
      id: z.number().int().positive(),
      adapter: string,
      host: string,
      database: string,
      port: number
    }),
    raw
  );
  return {
    dataSourceToken: value.token,
    dataSourceId: value.id,
    ...base(value),
    adapter: value.adapter,
    host: value.host,
    database: value.database,
    port: value.port
  };
};
const calendarValue = z.union([z.number(), z.string()]).nullish();
const calendarNumber = (value: string | number | null | undefined) =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value)
      ? Number(value)
      : null;
export const normalizeSchedule = (raw: unknown) => {
  const value = parse(
    common.extend({
      frequency: string,
      time_zone: string,
      hour: calendarValue,
      minute: calendarValue,
      day_of_week: calendarValue,
      day_of_month: calendarValue,
      cron: z
        .object({
          freq: string,
          hour: z.number().nullish(),
          minute: z.number().nullish(),
          day_of_week: z.number().nullish(),
          day_of_month: z.number().nullish(),
          time_zone: string
        })
        .nullish()
    }),
    raw
  );
  return {
    scheduleToken: value.token,
    name: value.name,
    frequency: value.cron?.freq || value.frequency,
    hour: value.cron?.hour ?? calendarNumber(value.hour),
    minute: value.cron?.minute ?? calendarNumber(value.minute),
    dayOfWeek: value.cron?.day_of_week ?? calendarNumber(value.day_of_week),
    dayOfMonth: value.cron?.day_of_month ?? calendarNumber(value.day_of_month),
    timeZone: value.cron?.time_zone || value.time_zone,
    hourDescription: typeof value.hour === 'string' ? value.hour : undefined,
    minuteDescription: typeof value.minute === 'string' ? value.minute : undefined,
    createdAt: value.created_at,
    updatedAt: value.updated_at
  };
};
export const normalizeDefinition = (raw: unknown) => {
  const value = parse(
    common.extend({ source: z.string(), data_source_id: number.pipe(z.number().positive()) }),
    raw
  );
  return {
    definitionToken: value.token,
    ...base(value),
    source: value.source,
    dataSourceId: value.data_source_id
  };
};
export const normalizeMember = (raw: unknown) => {
  const value = parse(
    z.object({
      token: z.string().optional(),
      state: z.string().min(1),
      member_username: string,
      member_email: string,
      name: string,
      member_name: string,
      admin: z.boolean(),
      created_at: string,
      updated_at: string,
      _links: links.optional()
    }),
    raw
  );
  let token = value.token;
  if (!token) {
    try {
      const url = new URL(value._links?.self?.href ?? '', 'https://app.mode.com');
      if (
        url.origin !== 'https://app.mode.com' ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw createApiServiceError('Mode returned an invalid membership identity.');
      token = /^\/api\/[^/]+\/memberships\/([^/]+)$/.exec(url.pathname)?.[1];
    } catch {
      throw createApiServiceError('Mode returned an invalid membership identity.');
    }
  }
  if (!token)
    throw createApiServiceError(
      'Mode did not return the membership token or its resource link.'
    );
  return {
    membershipToken: token,
    state: value.state,
    memberUsername: value.member_username,
    memberEmail: value.member_email,
    memberName: value.name || value.member_name,
    admin: value.admin,
    createdAt: value.created_at,
    updatedAt: value.updated_at
  };
};
export const getEmbedded = (data: unknown, key: string): unknown[] => {
  const value = parse(z.object({ _embedded: z.record(z.string(), z.unknown()) }), data);
  return parse(z.array(z.unknown()), value._embedded[key]);
};
export const getNextLink = (data: unknown) =>
  parse(z.object({ _links: links.optional() }), data)._links?.next_page?.href;
export const paginationSchema = z.object({
  nextPage: z.number().optional(),
  totalPages: z.number().optional(),
  totalCount: z.number().optional()
});
export const pagination = (data: unknown) => {
  const value = parse(
    z.object({
      pagination: z
        .object({ total_pages: number.optional(), total_count: number.optional() })
        .optional(),
      _links: links.optional()
    }),
    data
  );
  const href = value._links?.next_page?.href;
  let nextPage: number | undefined;
  if (href) {
    try {
      const url = new URL(href, 'https://app.mode.com');
      const page = url.searchParams.get('page');
      if (
        url.origin !== 'https://app.mode.com' ||
        url.username ||
        url.password ||
        url.hash ||
        !page ||
        !/^\d+$/.test(page) ||
        !Number.isSafeInteger(Number(page)) ||
        Number(page) < 1
      )
        throw createApiServiceError('Mode returned an invalid pagination link.');
      nextPage = Number(page);
    } catch {
      throw createApiServiceError('Mode returned an invalid pagination link.');
    }
  }
  return value.pagination || nextPage
    ? {
        nextPage,
        totalPages: value.pagination?.total_pages,
        totalCount: value.pagination?.total_count
      }
    : undefined;
};
