import { requireValue, url, z } from './contracts';

const optionalText = z
  .string()
  .nullish()
  .transform(v => v ?? undefined);
const records = z.record(z.string(), z.unknown());
const cost = z.object({ total: z.number().finite().nonnegative() }).passthrough().optional();
export const resultSchema = z
  .object({
    id: z.string().optional(),
    title: optionalText,
    url: z.string().url(),
    publishedDate: optionalText,
    author: optionalText,
    text: optionalText,
    highlights: z.array(z.string()).optional(),
    summary: optionalText
  })
  .passthrough();
export const searchSchema = z
  .object({
    requestId: z.string().min(1),
    results: z.array(resultSchema),
    searchType: z.string().optional(),
    resolvedSearchType: z.string().optional(),
    costDollars: cost
  })
  .passthrough();
export const contentsSchema = searchSchema.extend({
  statuses: z
    .array(
      z
        .object({
          id: z.string(),
          status: z.enum(['success', 'error']),
          source: z.enum(['cached', 'crawled']).optional(),
          error: z
            .object({
              tag: z.string(),
              httpStatusCode: z.number().int().nullable().optional()
            })
            .nullable()
            .optional()
        })
        .passthrough()
    )
    .optional()
});
export const answerSchema = z
  .object({
    answer: z.string(),
    citations: z
      .array(resultSchema.omit({ id: true }))
      .optional()
      .transform(v => v ?? []),
    costDollars: cost
  })
  .passthrough();
export const researchSchema = z
  .object({
    researchId: z.string().min(1),
    status: z.enum(['pending', 'running', 'completed', 'failed', 'canceled']),
    createdAt: z.number().int().nonnegative(),
    finishedAt: z.number().int().nonnegative().optional(),
    model: z.string().optional(),
    instructions: z.string().optional(),
    output: z.object({ content: z.string(), parsed: records.optional() }).optional(),
    costDollars: cost,
    error: z.string().optional(),
    events: z.array(records).optional()
  })
  .passthrough()
  .superRefine((v, ctx) => {
    if (v.status === 'completed' && !v.output)
      ctx.addIssue({ code: 'custom', message: 'Completed research output is missing.' });
    if (v.status === 'failed' && !v.error)
      ctx.addIssue({ code: 'custom', message: 'Failed research error is missing.' });
  });
export const enrichmentSchema = z
  .object({
    id: z.string().min(1),
    object: z.literal('webset_enrichment'),
    websetId: z.string().min(1),
    status: z.enum(['pending', 'completed', 'canceled']),
    description: z.string(),
    format: optionalText,
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .passthrough();
export const websetSchema = z
  .object({
    id: z.string().min(1),
    object: z.literal('webset'),
    status: z.enum(['idle', 'pending', 'running', 'paused']),
    title: optionalText,
    externalId: optionalText,
    metadata: z.record(z.string(), z.string()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    searches: z.array(records).optional(),
    imports: z.array(records).optional(),
    enrichments: z.array(enrichmentSchema).optional(),
    monitors: z.array(records).optional(),
    dashboardUrl: z.string().url().optional()
  })
  .passthrough();
export const itemSchema = z
  .object({
    id: z.string().min(1),
    object: z.literal('webset_item'),
    websetId: z.string().min(1),
    status: z.string().optional(),
    url: z.string().url().optional(),
    title: optionalText,
    source: z.enum(['search', 'import']),
    sourceId: z.string().min(1),
    properties: records,
    enrichments: z.array(records).nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    evaluations: z.array(records)
  })
  .passthrough();
export function mapItem(item: z.infer<typeof itemSchema>) {
  const native = item.enrichments;
  let enrichments: Record<string, unknown> | undefined;
  if (Array.isArray(native)) {
    enrichments = {};
    for (const e of native) {
      requireValue(
        typeof e.enrichmentId === 'string' &&
          e.enrichmentId.length > 0 &&
          !Object.hasOwn(enrichments, e.enrichmentId),
        'Exa returned ambiguous enrichment IDs.'
      );
      Object.defineProperty(enrichments, e.enrichmentId, {
        value: e,
        enumerable: true,
        writable: true,
        configurable: true
      });
    }
  }
  const address = item.url ?? item.properties.url;
  requireValue(typeof address === 'string', 'Exa item is missing its native source URL.');
  url(address);
  let title = item.title;
  for (const kind of ['company', 'person', 'article', 'researchPaper', 'custom']) {
    const detail = item.properties[kind];
    if (title === undefined && detail && typeof detail === 'object') {
      const row = detail as Record<string, unknown>;
      const name = kind === 'company' || kind === 'person' ? row.name : row.title;
      if (typeof name === 'string') title = name;
    }
  }
  return {
    ...item,
    url: address,
    title,
    enrichments,
    enrichmentResults: Array.isArray(native) ? native : native === null ? null : undefined
  };
}
export const monitorSchema = z
  .object({
    id: z.string().min(1),
    object: z.literal('monitor'),
    websetId: z.string().min(1),
    status: z.enum(['enabled', 'disabled']),
    behavior: z
      .object({
        type: z.literal('search'),
        config: z.object({ count: z.number().positive() }).passthrough()
      })
      .passthrough(),
    cadence: z.object({ cron: z.string(), timezone: z.string().optional() }),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .passthrough();
export const teamSchema = z.object({
  object: z.literal('team'),
  id: z.string().min(1),
  name: z.string(),
  concurrency: z.object({
    active: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative()
  }),
  limits: z.object({
    maxConcurrent: z.number().int().nonnegative().nullable(),
    maxQueued: z.number().int().nonnegative().nullable()
  })
});
export function pageSchema<T extends z.ZodType>(schema: T) {
  return z
    .object({ data: z.array(schema), hasMore: z.boolean(), nextCursor: z.string().nullable() })
    .superRefine((v, ctx) => {
      if (v.hasMore && !v.nextCursor)
        ctx.addIssue({ code: 'custom', message: 'Continuation cursor missing.' });
    })
    .transform(v => ({ ...v, nextCursor: v.nextCursor ?? undefined }));
}
export const legacyExportSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().min(1),
    websetId: z.string().optional(),
    downloadUrl: z.string().url().optional()
  })
  .passthrough();
