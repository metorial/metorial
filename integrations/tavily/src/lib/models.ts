import { requireValue, z } from './contracts';

const elapsed = z
  .union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/)])
  .transform(Number)
  .pipe(z.number().finite().nonnegative());
const text = z
  .string()
  .nullish()
  .transform(v => v ?? undefined);
const usage = z
  .object({ credits: z.number().finite().nonnegative() })
  .passthrough()
  .optional();
const receipt = { response_time: elapsed, request_id: z.string().optional(), usage };
export const searchResponse = z
  .object({
    ...receipt,
    query: z.string(),
    answer: text,
    images: z
      .array(z.object({ url: z.string(), description: text }))
      .nullish()
      .transform(v => v ?? undefined),
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
        score: z.number().finite(),
        raw_content: text,
        favicon: text
      })
    ),
    auto_parameters: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform(v => v ?? undefined)
  })
  .passthrough();
export const extractResponse = z
  .object({
    ...receipt,
    results: z.array(
      z.object({
        url: z.string(),
        raw_content: z.string(),
        images: z
          .array(z.string())
          .nullish()
          .transform(v => v ?? undefined),
        favicon: text
      })
    ),
    failed_results: z.array(z.object({ url: z.string(), error: z.string() }))
  })
  .passthrough();
export const crawlResponse = z
  .object({
    ...receipt,
    base_url: z.string(),
    results: z.array(z.object({ url: z.string(), raw_content: z.string(), favicon: text }))
  })
  .passthrough();
export const mapResponse = z
  .object({ ...receipt, base_url: z.string(), results: z.array(z.string()) })
  .passthrough();
export const researchCreateResponse = z
  .object({
    ...receipt,
    request_id: z.string(),
    created_at: z.string(),
    status: z.enum(['pending', 'in_progress']),
    input: z.string(),
    model: z.string()
  })
  .passthrough();
export const researchResponse = z
  .object({
    ...receipt,
    request_id: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
    created_at: z.string().optional(),
    content: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
    sources: z
      .array(z.object({ title: z.string(), url: z.string(), favicon: text }))
      .optional()
  })
  .passthrough();
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const usageResponse = z
  .object({
    key: z.object({
      usage: count,
      limit: count.nullable(),
      search_usage: count,
      extract_usage: count,
      crawl_usage: count,
      map_usage: count,
      research_usage: count
    }),
    account: z.object({
      current_plan: z.string(),
      plan_usage: count,
      plan_limit: count,
      paygo_usage: count,
      paygo_limit: count
    })
  })
  .passthrough();
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  requireValue(
    result.success,
    'Tavily returned an incomplete or invalid native receipt. Reconcile any accepted request before retrying.'
  );
  return result.data;
}
