import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import type { OdooDomainFilter } from '../lib/client';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const MAX_DOMAIN_TOKENS = 200;
const MAX_LIMIT = 1000;
const MAX_OFFSET = 100_000;
const MODEL_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const ORDER_TERM_PATTERN =
  /^([A-Za-z_][A-Za-z0-9_.]*)(?:\s+(asc|desc))?(?:\s+nulls\s+(first|last))?$/i;
const LOGICAL_OPERATORS = new Set(['&', '|', '!']);
const DOMAIN_OPERATORS = new Set([
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  '=?',
  '=like',
  'like',
  'not like',
  'not =like',
  '=ilike',
  'ilike',
  'not ilike',
  'not =ilike',
  'in',
  'not in',
  'child_of',
  'parent_of',
  'any',
  'not any'
]);

let invalidSearchInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let domainFilterSchema = z
  .array(
    z.union([
      z.enum(['&', '|', '!']).describe('Prefix logical operator: "&", "|", or "!"'),
      z.tuple([
        z.string().trim().min(1).describe('Technical field name or relationship traversal'),
        z
          .string()
          .trim()
          .min(1)
          .describe(
            'Odoo domain operator, such as =, !=, >, >=, <, <=, ilike, in, child_of, or any'
          ),
        z.unknown().describe('Value to compare against')
      ])
    ])
  )
  .max(MAX_DOMAIN_TOKENS)
  .describe(
    'Odoo domain list. Criteria are [field, operator, value] triples; adjacent criteria use implicit AND, while "&", "|", and "!" use prefix notation.'
  );

let requiredModel = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidSearchInput('Odoo model is required.', 'odoo_model_required');
  }

  let model = value.trim();
  if (!MODEL_NAME_PATTERN.test(model)) {
    throw invalidSearchInput(
      'Odoo model must be a technical model name such as "res.partner".',
      'odoo_model_invalid'
    );
  }

  return model;
};

let normalizeDomainFilter = (value: unknown, depth = 0): OdooDomainFilter => {
  if (!Array.isArray(value)) {
    throw invalidSearchInput('Odoo domain must be an array.', 'odoo_domain_invalid');
  }
  if (value.length > MAX_DOMAIN_TOKENS) {
    throw invalidSearchInput(
      `Odoo domain cannot contain more than ${MAX_DOMAIN_TOKENS} tokens.`,
      'odoo_domain_too_large'
    );
  }
  if (depth > 8) {
    throw invalidSearchInput('Odoo domain nesting is too deep.', 'odoo_domain_too_deep');
  }

  let domain: OdooDomainFilter = [];
  for (let [index, item] of value.entries()) {
    if (typeof item === 'string') {
      if (!LOGICAL_OPERATORS.has(item)) {
        throw invalidSearchInput(
          `Domain token ${index + 1} must be "&", "|", "!", or a criterion triple.`,
          'odoo_domain_token_invalid'
        );
      }
      domain.push(item);
      continue;
    }

    if (!Array.isArray(item) || item.length !== 3) {
      throw invalidSearchInput(
        `Domain criterion ${index + 1} must contain exactly [field, operator, value].`,
        'odoo_domain_criterion_invalid'
      );
    }

    let [fieldValue, operatorValue, comparisonValue] = item;
    if (typeof fieldValue !== 'string' || !FIELD_NAME_PATTERN.test(fieldValue.trim())) {
      throw invalidSearchInput(
        `Domain criterion ${index + 1} has an invalid technical field name.`,
        'odoo_domain_field_invalid'
      );
    }
    if (typeof operatorValue !== 'string') {
      throw invalidSearchInput(
        `Domain criterion ${index + 1} has an invalid operator.`,
        'odoo_domain_operator_invalid'
      );
    }

    let field = fieldValue.trim();
    let operator = operatorValue.trim().toLowerCase().replace(/\s+/g, ' ');
    if (operator === '<>') operator = '!=';
    if (!DOMAIN_OPERATORS.has(operator)) {
      throw invalidSearchInput(
        `Domain criterion ${index + 1} uses unsupported operator "${operatorValue}".`,
        'odoo_domain_operator_invalid'
      );
    }
    if ((operator === 'in' || operator === 'not in') && !Array.isArray(comparisonValue)) {
      throw invalidSearchInput(
        `Domain operator "${operator}" requires an array value.`,
        'odoo_domain_value_invalid'
      );
    }
    if (operator === 'any' || operator === 'not any') {
      comparisonValue = normalizeDomainFilter(comparisonValue, depth + 1);
    }

    domain.push([field, operator, comparisonValue]);
  }

  // Prefix operators consume expressions to their right. More than one final
  // expression is valid because Odoo treats adjacent criteria as implicit AND.
  let availableExpressions = 0;
  for (let index = domain.length - 1; index >= 0; index -= 1) {
    let token = domain[index];
    if (Array.isArray(token)) {
      availableExpressions += 1;
      continue;
    }

    let requiredExpressions = token === '!' ? 1 : 2;
    if (availableExpressions < requiredExpressions) {
      throw invalidSearchInput(
        `Logical operator "${token}" does not have enough following criteria.`,
        'odoo_domain_structure_invalid'
      );
    }
    if (token !== '!') {
      availableExpressions -= 1;
    }
  }

  return domain;
};

let normalizeFields = (value: unknown): string[] | undefined => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw invalidSearchInput('Odoo fields must be an array.', 'odoo_fields_invalid');
  }

  return value.map((field, index) => {
    if (typeof field !== 'string' || !FIELD_NAME_PATTERN.test(field.trim())) {
      throw invalidSearchInput(
        `Field ${index + 1} must be a valid technical field name.`,
        'odoo_field_invalid'
      );
    }
    return field.trim();
  });
};

let normalizeLimit = (value: unknown) => {
  let limit = value ?? 50;
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit <= 0 ||
    limit > MAX_LIMIT
  ) {
    throw invalidSearchInput(
      `Limit must be a positive integer no greater than ${MAX_LIMIT}.`,
      'odoo_limit_invalid'
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
    throw invalidSearchInput(
      `Offset must be a nonnegative integer no greater than ${MAX_OFFSET}.`,
      'odoo_offset_invalid'
    );
  }
  return offset;
};

let normalizeOrder = (value: unknown) => {
  if (value !== undefined && typeof value !== 'string') {
    throw invalidSearchInput('Order must be text.', 'odoo_order_invalid');
  }

  let order = typeof value === 'string' ? value.trim() : '';
  if (order === '') return 'id asc';

  let terms = order.split(',').map(term => term.trim());
  if (terms.some(term => term === '' || !ORDER_TERM_PATTERN.test(term))) {
    throw invalidSearchInput(
      'Order must be a comma-separated list such as "name asc, create_date desc".',
      'odoo_order_invalid'
    );
  }

  let hasIdTieBreaker = terms.some(term => ORDER_TERM_PATTERN.exec(term)?.[1] === 'id');
  return hasIdTieBreaker ? terms.join(', ') : `${terms.join(', ')}, id asc`;
};

let normalizeContext = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidSearchInput('Odoo context must be an object.', 'odoo_context_invalid');
  }
  return { ...(value as Record<string, unknown>) };
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type Client = ReturnType<typeof createClient>;

let searchRead = async (
  client: Client,
  model: string,
  domain: OdooDomainFilter,
  options: {
    fields?: string[];
    limit: number;
    offset: number;
    order: string;
    context?: Record<string, unknown>;
  }
) => {
  if (!options.context) {
    return client.searchRead(model, domain, options);
  }

  let result = await client.callModelMethod({
    model,
    method: 'search_read',
    arguments: { domain, ...options },
    legacyArguments: [domain],
    legacyKeywordArguments: options
  });
  if (!Array.isArray(result) || !result.every(isRecord)) {
    throw invalidSearchInput(
      'Odoo returned an invalid record list for this search.',
      'odoo_search_response_invalid'
    );
  }
  return result;
};

let searchCount = async (
  client: Client,
  model: string,
  domain: OdooDomainFilter,
  context?: Record<string, unknown>
) => {
  if (!context) return client.searchCount(model, domain);

  let result = await client.callModelMethod({
    model,
    method: 'search_count',
    arguments: { domain, context },
    legacyArguments: [domain],
    legacyKeywordArguments: { context }
  });
  if (typeof result !== 'number' || !Number.isInteger(result) || result < 0) {
    throw invalidSearchInput(
      'Odoo returned an invalid count for this search.',
      'odoo_search_count_response_invalid'
    );
  }
  return result;
};

export let searchRecords = SlateTool.create(spec, {
  name: 'Search Records',
  key: 'search_records',
  description: `Search and retrieve records from any Odoo model using domain filters. Supports pagination, focused field selection, context, and stable sorting. Use this to find contacts, leads, orders, invoices, products, or other record types.

Common models: **res.partner** (contacts), **crm.lead** (leads/opportunities), **sale.order** (sales orders), **account.move** (invoices/bills), **product.product** (products), **stock.picking** (transfers), **project.task** (tasks), **hr.employee** (employees).`,
  instructions: [
    'Adjacent domain criteria use implicit AND. Prefix "&", "|", and "!" may explicitly combine criteria.',
    'Pass an empty domain [] to retrieve all records, subject to the limit.',
    'Use "ilike" for case-insensitive partial matching and "in" with an array value for membership.',
    'Pass a focused fields list. Use list_model_fields first when unsure, and exclude fields whose Odoo type is binary (commonly image, avatar, datas, raw, or db_datas fields) because they can contain large base64 payloads.',
    'Pagination uses a stable order. If order omits id, "id asc" is appended as a deterministic tie-breaker.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .trim()
        .min(1)
        .max(128)
        .regex(MODEL_NAME_PATTERN)
        .describe('Technical Odoo model name, such as "res.partner" or "sale.order"'),
      domain: domainFilterSchema
        .default([])
        .describe('Domain filter conditions. Empty array [] returns all records.'),
      fields: z
        .array(z.string().trim().min(1).max(128).regex(FIELD_NAME_PATTERN))
        .optional()
        .describe(
          'Focused technical field names to return. Avoid binary/base64 fields (for example image, avatar, datas, raw, or db_datas fields). Omitting this may return every readable field and a much larger response.'
        ),
      limit: z
        .number()
        .int()
        .positive()
        .max(MAX_LIMIT)
        .optional()
        .default(50)
        .describe(`Maximum records to return, from 1 to ${MAX_LIMIT} (default: 50)`),
      offset: z
        .number()
        .int()
        .nonnegative()
        .max(MAX_OFFSET)
        .optional()
        .default(0)
        .describe(`Number of matching records to skip, from 0 to ${MAX_OFFSET} (default: 0)`),
      order: z
        .string()
        .trim()
        .max(500)
        .optional()
        .describe(
          'Comma-separated sort terms (for example "name asc, create_date desc"). Defaults to "id asc"; id is appended when absent.'
        ),
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
      records: z.array(z.record(z.string(), z.unknown())).describe('Records in this page'),
      count: z
        .number()
        .int()
        .nonnegative()
        .describe(
          'Backward-compatible matching-record count from a separate search_count request; concurrent changes can make it differ from this page'
        ),
      paging: z.object({
        limit: z.number().int().positive(),
        offset: z.number().int().nonnegative(),
        returnedCount: z.number().int().nonnegative(),
        hasMore: z.boolean(),
        nextOffset: z.number().int().nonnegative().nullable(),
        order: z.string(),
        countBasis: z
          .literal('separate_request_snapshot')
          .describe(
            'The count was measured by a separate request and is not an atomic page total'
          )
      })
    })
  )
  .handleInvocation(async ctx => {
    let model = requiredModel(ctx.input.model);
    let domain = normalizeDomainFilter(ctx.input.domain ?? []);
    let fields = normalizeFields(ctx.input.fields);
    let limit = normalizeLimit(ctx.input.limit);
    let offset = normalizeOffset(ctx.input.offset);
    let order = normalizeOrder(ctx.input.order);
    let context = normalizeContext(ctx.input.context);

    try {
      let client = createClient(ctx);
      let [fetchedRecords, count] = await Promise.all([
        searchRead(client, model, domain, {
          fields,
          limit: limit + 1,
          offset,
          order,
          context
        }),
        searchCount(client, model, domain, context)
      ]);
      let hasMore = fetchedRecords.length > limit;
      let records = fetchedRecords.slice(0, limit);
      let nextOffset = hasMore ? offset + records.length : null;

      return {
        output: {
          records,
          count,
          paging: {
            limit,
            offset,
            returnedCount: records.length,
            hasMore,
            nextOffset,
            order,
            countBasis: 'separate_request_snapshot' as const
          }
        },
        message: `Returned **${records.length}** record(s) from \`${model}\` at offset ${offset}. The separate count snapshot found **${count}** matching record(s).${
          hasMore ? ` Continue with offset ${nextOffset}.` : ''
        }${fields ? '' : ' For smaller responses, pass a focused non-binary fields list.'}`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `searching ${model}`,
        reason: 'odoo_search_records_failed'
      });
    }
  })
  .build();
