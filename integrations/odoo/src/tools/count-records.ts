import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import type { OdooDomainFilter } from '../lib/client';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const MAX_DOMAIN_TOKENS = 200;
const MAX_COUNT_LIMIT = 1_000_000;
const MAX_DOMAIN_DEPTH = 8;
const MODEL_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
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

let invalidCountInput = (message: string, reason: string) =>
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

let normalizeModel = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidCountInput('Odoo model is required.', 'odoo_count_records_model_required');
  }

  let model = value.trim();
  if (!MODEL_NAME_PATTERN.test(model)) {
    throw invalidCountInput(
      'Odoo model must be a technical model name such as "res.partner".',
      'odoo_count_records_model_invalid'
    );
  }
  return model;
};

let normalizeDomain = (value: unknown, depth = 0): OdooDomainFilter => {
  if (!Array.isArray(value)) {
    throw invalidCountInput(
      'Odoo domain must be an array.',
      'odoo_count_records_domain_invalid'
    );
  }
  if (value.length > MAX_DOMAIN_TOKENS) {
    throw invalidCountInput(
      `Odoo domain cannot contain more than ${MAX_DOMAIN_TOKENS} tokens.`,
      'odoo_count_records_domain_too_large'
    );
  }
  if (depth > MAX_DOMAIN_DEPTH) {
    throw invalidCountInput(
      'Odoo domain nesting is too deep.',
      'odoo_count_records_domain_too_deep'
    );
  }

  let domain: OdooDomainFilter = [];
  for (let [index, item] of value.entries()) {
    if (typeof item === 'string') {
      if (!LOGICAL_OPERATORS.has(item)) {
        throw invalidCountInput(
          `Domain token ${index + 1} must be "&", "|", "!", or a criterion triple.`,
          'odoo_count_records_domain_token_invalid'
        );
      }
      domain.push(item);
      continue;
    }

    if (!Array.isArray(item) || item.length !== 3) {
      throw invalidCountInput(
        `Domain criterion ${index + 1} must contain exactly [field, operator, value].`,
        'odoo_count_records_domain_criterion_invalid'
      );
    }

    let [fieldValue, operatorValue, comparisonValue] = item;
    if (typeof fieldValue !== 'string' || !FIELD_NAME_PATTERN.test(fieldValue.trim())) {
      throw invalidCountInput(
        `Domain criterion ${index + 1} has an invalid technical field name.`,
        'odoo_count_records_domain_field_invalid'
      );
    }
    if (typeof operatorValue !== 'string') {
      throw invalidCountInput(
        `Domain criterion ${index + 1} has an invalid operator.`,
        'odoo_count_records_domain_operator_invalid'
      );
    }

    let field = fieldValue.trim();
    let operator = operatorValue.trim().toLowerCase().replace(/\s+/g, ' ');
    if (operator === '<>') operator = '!=';
    if (!DOMAIN_OPERATORS.has(operator)) {
      throw invalidCountInput(
        `Domain criterion ${index + 1} uses unsupported operator "${operatorValue}".`,
        'odoo_count_records_domain_operator_invalid'
      );
    }
    if ((operator === 'in' || operator === 'not in') && !Array.isArray(comparisonValue)) {
      throw invalidCountInput(
        `Domain operator "${operator}" requires an array value.`,
        'odoo_count_records_domain_value_invalid'
      );
    }
    if (operator === 'any' || operator === 'not any') {
      comparisonValue = normalizeDomain(comparisonValue, depth + 1);
    }

    domain.push([field, operator, comparisonValue]);
  }

  // Prefix operators consume expressions to their right. Remaining expressions
  // are valid because Odoo treats adjacent criteria as an implicit AND.
  let availableExpressions = 0;
  for (let index = domain.length - 1; index >= 0; index -= 1) {
    let token = domain[index];
    if (Array.isArray(token)) {
      availableExpressions += 1;
      continue;
    }

    let requiredExpressions = token === '!' ? 1 : 2;
    if (availableExpressions < requiredExpressions) {
      throw invalidCountInput(
        `Logical operator "${token}" does not have enough following criteria.`,
        'odoo_count_records_domain_structure_invalid'
      );
    }
    if (token !== '!') availableExpressions -= 1;
  }

  return domain;
};

let normalizeLimit = (value: unknown): number | undefined => {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value <= 0 ||
    value > MAX_COUNT_LIMIT
  ) {
    throw invalidCountInput(
      `Count limit must be a positive integer no greater than ${MAX_COUNT_LIMIT}.`,
      'odoo_count_records_limit_invalid'
    );
  }
  return value;
};

let normalizeContext = (value: unknown): Record<string, unknown> | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidCountInput(
      'Odoo context must be an object.',
      'odoo_count_records_context_invalid'
    );
  }
  return { ...(value as Record<string, unknown>) };
};

let supportsNativeCountLimit = (auth: { transport?: string; serverVersion?: string }) => {
  // JSON-2 starts with Odoo 19, so its search_count always supports limit.
  if (auth.transport === 'json2') return true;
  if (typeof auth.serverVersion !== 'string') return false;

  let majorMatch = /^(\d+)(?:\.|$)/.exec(auth.serverVersion.trim());
  let majorText = majorMatch?.[1];
  if (!majorText) return false;
  return Number.parseInt(majorText, 10) >= 16;
};

export let countRecords = SlateTool.create(spec, {
  name: 'Count Records',
  key: 'count_records',
  description:
    'Count records in any Odoo model that match a domain filter, without retrieving record data. This is an independent snapshot request; it is not an atomic companion to search_records or any other read.',
  instructions: [
    'Pass an empty domain [] to count all records visible to the connected user.',
    'Adjacent domain criteria use implicit AND. Prefix "&", "|", and "!" may explicitly combine criteria.',
    'Use limit when only an upper-bound count is needed. If the returned count reaches the limit, additional matching records may exist.',
    'Counts reflect access rules and the database state at the time this independent request runs.'
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
        .describe('Domain filter conditions. Empty array [] matches all visible records.'),
      limit: z
        .number()
        .int()
        .positive()
        .max(MAX_COUNT_LIMIT)
        .optional()
        .describe(
          `Optional upper bound on the count, from 1 to ${MAX_COUNT_LIMIT}. Omit for the full matching count.`
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
      count: z.number().int().nonnegative().describe('Matching record count returned by Odoo'),
      limit: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe('Applied count upper bound, or null when the full count was requested'),
      limitReached: z
        .boolean()
        .describe(
          'Whether the count reached the requested upper bound; when true, additional matching records may exist'
        ),
      countBasis: z
        .literal('independent_request_snapshot')
        .describe(
          'This count came from its own request and is not atomic with search_records or another operation'
        )
    })
  )
  .handleInvocation(async ctx => {
    let model = normalizeModel(ctx.input.model);
    let domain = normalizeDomain(ctx.input.domain ?? []);
    let limit = normalizeLimit(ctx.input.limit);
    let context = normalizeContext(ctx.input.context);
    let nativeCountLimit = limit !== undefined && supportsNativeCountLimit(ctx.auth);
    let keywordArguments: Record<string, unknown> = {};
    if (nativeCountLimit) keywordArguments.limit = limit;
    if (context !== undefined) keywordArguments.context = context;

    try {
      let client = createClient(ctx);
      let result = await client.callModelMethod({
        model,
        method: 'search_count',
        arguments: { domain, ...keywordArguments },
        legacyArguments: [domain],
        legacyKeywordArguments: keywordArguments
      });
      if (typeof result !== 'number' || !Number.isSafeInteger(result) || result < 0) {
        throw invalidCountInput(
          'Odoo returned an invalid record count.',
          'odoo_count_records_response_invalid'
        );
      }

      // Odoo added search_count(limit=...) in version 16. For older or
      // unversioned legacy connections, preserve compatibility by requesting
      // the full count and applying the caller's upper bound locally.
      let count = limit !== undefined && !nativeCountLimit ? Math.min(result, limit) : result;
      let limitReached = limit !== undefined && result >= limit;
      return {
        output: {
          count,
          limit: limit ?? null,
          limitReached,
          countBasis: 'independent_request_snapshot' as const
        },
        message: limitReached
          ? `Found at least **${count}** matching record(s) in \`${model}\`; the count reached the configured upper bound. This is an independent snapshot.`
          : `Found **${count}** matching record(s) in \`${model}\`. This is an independent snapshot.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `counting ${model} records`,
        reason: 'odoo_count_records_failed'
      });
    }
  })
  .build();
