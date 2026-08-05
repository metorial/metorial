import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import type { OdooDomainFilter } from '../lib/client';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
const MAX_OFFSET = 100_000;
const MAX_SEARCH_LENGTH = 256;
const MODEL_ORDER = 'model asc, id asc';
const MODEL_FIELDS = ['model', 'name', 'state', 'transient'] as const;

let modelInfoSchema = z.object({
  modelId: z
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .describe('Internal ID of the model definition'),
  model: z.string().trim().min(1).describe('Technical model name, such as "res.partner"'),
  name: z.string().trim().min(1).describe('Display name, such as "Contact"'),
  state: z
    .enum(['base', 'manual'])
    .describe('Whether the model comes from installed code or is a custom model'),
  transient: z.boolean().describe('Whether the model stores temporary wizard data')
});

let invalidListModelsData = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let normalizeSearch = (value: unknown): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw invalidListModelsData(
      'Model search text must be a string.',
      'odoo_list_models_search_invalid'
    );
  }

  let search = value.trim();
  if (search.length > MAX_SEARCH_LENGTH) {
    throw invalidListModelsData(
      `Model search text cannot exceed ${MAX_SEARCH_LENGTH} characters.`,
      'odoo_list_models_search_too_long'
    );
  }
  return search === '' ? undefined : search;
};

let normalizeLimit = (value: unknown) => {
  let limit = value ?? DEFAULT_LIMIT;
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    limit > MAX_LIMIT
  ) {
    throw invalidListModelsData(
      `Limit must be a positive integer no greater than ${MAX_LIMIT}.`,
      'odoo_list_models_limit_invalid'
    );
  }
  return limit;
};

let normalizeOffset = (value: unknown) => {
  let offset = value ?? 0;
  if (
    typeof offset !== 'number' ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > MAX_OFFSET
  ) {
    throw invalidListModelsData(
      `Offset must be a nonnegative integer no greater than ${MAX_OFFSET}.`,
      'odoo_list_models_offset_invalid'
    );
  }
  return offset;
};

let normalizeContext = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidListModelsData(
      'Odoo context must be an object.',
      'odoo_list_models_context_invalid'
    );
  }
  return { ...(value as Record<string, unknown>) };
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let parseModelRecord = (value: unknown, index: number): z.infer<typeof modelInfoSchema> => {
  if (!isRecord(value)) {
    throw invalidListModelsData(
      `Odoo returned an invalid model definition at position ${index + 1}.`,
      'odoo_list_models_response_invalid'
    );
  }

  let result = modelInfoSchema.safeParse({
    modelId: value.id,
    model: value.model,
    name: value.name,
    state: value.state,
    transient: value.transient
  });
  if (!result.success) {
    throw invalidListModelsData(
      `Odoo returned incomplete model metadata at position ${index + 1}.`,
      'odoo_list_models_response_invalid'
    );
  }
  return result.data;
};

export let listModels = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description:
    'List Odoo model definitions visible to the connected user. Use this to discover technical model names before searching, reading, or writing records.',
  instructions: [
    'Search matches either the technical model name or display name.',
    'Results use a stable technical-name and record-ID order for offset pagination.',
    'The matching count comes from a separate request and may differ from the returned page if models change concurrently.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .trim()
        .max(MAX_SEARCH_LENGTH)
        .optional()
        .describe('Optional text to match against the technical model name or display name'),
      limit: z
        .number()
        .int()
        .positive()
        .max(MAX_LIMIT)
        .optional()
        .default(DEFAULT_LIMIT)
        .describe(
          `Maximum models to return, from 1 to ${MAX_LIMIT} (default: ${DEFAULT_LIMIT})`
        ),
      offset: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_OFFSET)
        .optional()
        .default(0)
        .describe(`Number of matching models to skip, from 0 to ${MAX_OFFSET} (default: 0)`),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context values, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      models: z.array(modelInfoSchema).describe('Model definitions in this page'),
      count: z
        .number()
        .int()
        .nonnegative()
        .describe(
          'Backward-compatible matching-model count from a separate search_count request'
        ),
      paging: z.object({
        limit: z.number().int().positive(),
        offset: z.number().int().nonnegative(),
        returnedCount: z.number().int().nonnegative(),
        hasMore: z
          .boolean()
          .describe('Whether the fetched page showed at least one additional matching model'),
        nextOffset: z
          .number()
          .int()
          .nonnegative()
          .max(MAX_OFFSET)
          .nullable()
          .describe(
            'Callable offset for the next page, or null when no next page exists or continuing would exceed the supported offset range'
          ),
        order: z.string(),
        countBasis: z
          .literal('separate_request_snapshot')
          .describe('The count was measured by a separate, non-atomic request')
      })
    })
  )
  .handleInvocation(async ctx => {
    let search = normalizeSearch(ctx.input.search);
    let limit = normalizeLimit(ctx.input.limit);
    let offset = normalizeOffset(ctx.input.offset);
    let context = normalizeContext(ctx.input.context);
    let domain: OdooDomainFilter = search
      ? ['|', ['model', 'ilike', search], ['name', 'ilike', search]]
      : [];
    let searchArguments: Record<string, unknown> = {
      domain,
      fields: [...MODEL_FIELDS],
      limit: limit + 1,
      offset,
      order: MODEL_ORDER
    };
    let countArguments: Record<string, unknown> = { domain };
    if (context !== undefined) {
      searchArguments.context = context;
      countArguments.context = context;
    }

    try {
      let client = createClient(ctx);
      let [recordResult, countResult] = await Promise.all([
        client.callModelMethod({
          model: 'ir.model',
          method: 'search_read',
          arguments: searchArguments,
          legacyArguments: [domain],
          legacyKeywordArguments: {
            fields: [...MODEL_FIELDS],
            limit: limit + 1,
            offset,
            order: MODEL_ORDER,
            ...(context === undefined ? {} : { context })
          }
        }),
        client.callModelMethod({
          model: 'ir.model',
          method: 'search_count',
          arguments: countArguments,
          legacyArguments: [domain],
          legacyKeywordArguments: context === undefined ? {} : { context }
        })
      ]);

      if (!Array.isArray(recordResult)) {
        throw invalidListModelsData(
          'Odoo returned an invalid list of model definitions.',
          'odoo_list_models_response_invalid'
        );
      }
      if (
        typeof countResult !== 'number' ||
        !Number.isSafeInteger(countResult) ||
        countResult < 0
      ) {
        throw invalidListModelsData(
          'Odoo returned an invalid model count.',
          'odoo_list_models_count_response_invalid'
        );
      }

      let fetchedModels = recordResult.map(parseModelRecord);
      let hasMore = fetchedModels.length > limit;
      let models = fetchedModels.slice(0, limit);
      let nextOffsetCandidate = offset + models.length;
      let nextOffset =
        hasMore && nextOffsetCandidate <= MAX_OFFSET ? nextOffsetCandidate : null;
      let continuationMessage = !hasMore
        ? ''
        : nextOffset !== null
          ? ` Continue with offset ${nextOffset}.`
          : ` Additional models match, but continuing would exceed the maximum supported offset of ${MAX_OFFSET}. Refine the search text to continue.`;

      return {
        output: {
          models,
          count: countResult,
          paging: {
            limit,
            offset,
            returnedCount: models.length,
            hasMore,
            nextOffset,
            order: MODEL_ORDER,
            countBasis: 'separate_request_snapshot' as const
          }
        },
        message: `Returned **${models.length}** Odoo model definition(s) at offset ${offset}. The separate count snapshot found **${countResult}** matching model(s).${continuationMessage}`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: 'listing model definitions',
        reason: 'odoo_list_models_failed'
      });
    }
  })
  .build();
