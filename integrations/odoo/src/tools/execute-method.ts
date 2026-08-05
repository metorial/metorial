import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const MAX_RECORD_IDS = 100;
const MAX_JSON_DEPTH = 50;
const PUBLIC_METHOD_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

type JsonRecord = Record<string, unknown>;
type InvocationMode = 'model' | 'records';

let invalidExecuteInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let isPlainRecord = (value: unknown): value is JsonRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  let prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

let normalizeJsonValue = (
  value: unknown,
  path: string,
  reason: string,
  ancestors = new Set<object>(),
  depth = 0
): unknown => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value;
  }

  if (depth >= MAX_JSON_DEPTH) {
    throw invalidExecuteInput(
      `${path} exceeds the maximum supported JSON nesting depth of ${MAX_JSON_DEPTH}.`,
      reason
    );
  }
  if (typeof value !== 'object' || value === null) {
    throw invalidExecuteInput(`${path} must contain only JSON-compatible values.`, reason);
  }
  if (ancestors.has(value)) {
    throw invalidExecuteInput(`${path} must not contain a circular reference.`, reason);
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) {
      ancestors.delete(value);
      throw invalidExecuteInput(
        `${path} must not contain sparse or custom-keyed arrays.`,
        reason
      );
    }

    let normalized = value.map((item, index) =>
      normalizeJsonValue(item, `${path}[${index}]`, reason, ancestors, depth + 1)
    );
    ancestors.delete(value);
    return normalized;
  }

  if (!isPlainRecord(value)) {
    ancestors.delete(value);
    throw invalidExecuteInput(`${path} must contain only plain JSON objects.`, reason);
  }

  let normalized = Object.create(null) as JsonRecord;
  for (let key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      ancestors.delete(value);
      throw invalidExecuteInput(`${path} must not contain symbol keys.`, reason);
    }
    let descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      ancestors.delete(value);
      throw invalidExecuteInput(
        `${path}.${key} must be an enumerable JSON value, not an accessor or hidden property.`,
        reason
      );
    }

    Object.defineProperty(normalized, key, {
      configurable: true,
      enumerable: true,
      value: normalizeJsonValue(
        descriptor.value,
        `${path}.${key}`,
        reason,
        ancestors,
        depth + 1
      ),
      writable: true
    });
  }
  ancestors.delete(value);
  return normalized;
};

let normalizeJsonRecord = (value: unknown, label: string, reason: string) => {
  if (!isPlainRecord(value)) {
    throw invalidExecuteInput(`${label} must be a plain JSON object.`, reason);
  }
  return normalizeJsonValue(value, label, reason) as JsonRecord;
};

let jsonObjectSchema = (label: string, reason: string) =>
  z
    .unknown()
    .meta({ type: 'object', additionalProperties: {} })
    .superRefine((value, ctx) => {
      try {
        normalizeJsonRecord(value, label, reason);
      } catch {
        ctx.addIssue({
          code: 'custom',
          message: `${label} must be a plain JSON object containing only JSON-compatible values.`
        });
      }
    });

let normalizeModel = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidExecuteInput('Odoo model is required.', 'odoo_execute_method_model_required');
  }
  return value.trim();
};

let normalizeMethod = (value: unknown) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidExecuteInput(
      'Odoo public method name is required.',
      'odoo_execute_method_name_required'
    );
  }

  let method = value.trim();
  if (!PUBLIC_METHOD_NAME.test(method)) {
    throw invalidExecuteInput(
      'Provide a public Odoo model method name using letters, numbers, and underscores. Private methods (names beginning with "_") cannot be called through the external API.',
      'odoo_execute_method_name_invalid'
    );
  }
  return method;
};

let normalizeRecordIds = (value: unknown, invocationMode: InvocationMode) => {
  let recordIds = value === undefined ? [] : value;
  if (!Array.isArray(recordIds)) {
    throw invalidExecuteInput(
      'Odoo record IDs must be provided as an array.',
      'odoo_execute_method_ids_invalid'
    );
  }
  if (invocationMode === 'model') {
    if (recordIds.length > 0) {
      throw invalidExecuteInput(
        'Model-level invocation does not accept recordIds. Remove recordIds or choose invocationMode "records".',
        'odoo_execute_method_model_ids_invalid'
      );
    }
    return [];
  }
  if (recordIds.length === 0) {
    throw invalidExecuteInput(
      'Record-level invocation requires at least one Odoo record ID.',
      'odoo_execute_method_ids_required'
    );
  }
  if (recordIds.length > MAX_RECORD_IDS) {
    throw invalidExecuteInput(
      `Execute a record-level method on at most ${MAX_RECORD_IDS} records per request. Split larger operations into batches.`,
      'odoo_execute_method_batch_too_large'
    );
  }
  if (!recordIds.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
    throw invalidExecuteInput(
      'Every Odoo record ID must be a positive integer.',
      'odoo_execute_method_id_invalid'
    );
  }
  if (new Set(recordIds).size !== recordIds.length) {
    throw invalidExecuteInput(
      'Odoo record IDs must be unique within an execute-method request.',
      'odoo_execute_method_ids_duplicate'
    );
  }
  return recordIds as number[];
};

let mergeNamedArguments = (
  kwargs: JsonRecord | undefined,
  context: JsonRecord | undefined
) => {
  if (kwargs === undefined && context === undefined) return undefined;

  let namedArguments = Object.create(null) as JsonRecord;
  for (let [key, value] of Object.entries(kwargs ?? {})) {
    Object.defineProperty(namedArguments, key, {
      configurable: true,
      enumerable: true,
      value,
      writable: true
    });
  }
  if (context !== undefined) {
    Object.defineProperty(namedArguments, 'context', {
      configurable: true,
      enumerable: true,
      value: context,
      writable: true
    });
  }
  return namedArguments;
};

export let executeMethod = SlateTool.create(spec, {
  name: 'Execute Public Method',
  key: 'execute_method',
  description: `Expert fallback for calling a public method on any Odoo model. Prefer the dedicated search, create, update, delete, and workflow tools when one covers the operation; use this tool only when a required public workflow method is not otherwise exposed. The called method can modify data, trigger automation, send communications, or cause other business side effects.`,
  instructions: [
    'Use a dedicated workflow tool when available because it provides stronger validation and a more predictable result.',
    'Choose `records` for methods that operate on an existing recordset and provide the unique positive record IDs. Choose `model` for methods decorated as model-level methods and omit recordIds.',
    'For Odoo 19 JSON-2 connections, provide every method parameter in kwargs; positional args are not supported by JSON-2.',
    'For legacy JSON-RPC connections, args are passed positionally and kwargs are passed by name. Record IDs are prepended only for record-level invocation.',
    'Use context for language, company, and other Odoo execution context values. The dedicated context field overrides a context property in kwargs.',
    'Only public model methods can be called. Private method names beginning with an underscore are rejected.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .trim()
        .min(1)
        .describe('Technical Odoo model name, such as "sale.order" or "account.move"'),
      method: z
        .string()
        .trim()
        .min(1)
        .regex(PUBLIC_METHOD_NAME)
        .describe(
          'Public Odoo method name, such as "action_confirm" or "action_post". Private names beginning with an underscore are not allowed.'
        ),
      invocationMode: z
        .enum(['records', 'model'])
        .optional()
        .describe(
          'How to invoke the method. Use "records" for a recordset method and "model" for a model-level method. When omitted, non-empty recordIds select records mode; missing or empty recordIds select model mode for backward compatibility.'
        ),
      recordIds: z
        .array(z.number().int().positive())
        .max(MAX_RECORD_IDS)
        .refine(ids => new Set(ids).size === ids.length, 'Record IDs must be unique')
        .optional()
        .describe(
          `Unique positive record IDs for records mode (maximum ${MAX_RECORD_IDS}). Omit for model mode.`
        ),
      args: z
        .array(z.unknown())
        .optional()
        .describe(
          'Optional positional method arguments for legacy JSON-RPC only. Odoo 19 JSON-2 calls reject non-empty args; use kwargs instead.'
        ),
      kwargs: jsonObjectSchema('kwargs', 'odoo_execute_method_arguments_invalid')
        .optional()
        .describe(
          'Optional JSON-compatible named method arguments. Required for parameterized Odoo 19 JSON-2 methods; also passed as keyword arguments to legacy JSON-RPC.'
        ),
      context: jsonObjectSchema('context', 'odoo_execute_method_context_invalid')
        .optional()
        .describe(
          'Optional JSON-compatible Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('JSON-compatible return value from the public Odoo method')
    })
  )
  .handleInvocation(async ctx => {
    let model = normalizeModel(ctx.input.model);
    let method = normalizeMethod(ctx.input.method);
    let invocationMode =
      ctx.input.invocationMode ??
      (Array.isArray(ctx.input.recordIds) && ctx.input.recordIds.length > 0
        ? 'records'
        : 'model');
    let recordIds = normalizeRecordIds(ctx.input.recordIds, invocationMode);
    let args =
      ctx.input.args === undefined
        ? undefined
        : (normalizeJsonValue(
            ctx.input.args,
            'args',
            'odoo_execute_method_arguments_invalid'
          ) as unknown[]);
    let kwargs =
      ctx.input.kwargs === undefined
        ? undefined
        : normalizeJsonRecord(
            ctx.input.kwargs,
            'kwargs',
            'odoo_execute_method_arguments_invalid'
          );
    let context =
      ctx.input.context === undefined
        ? undefined
        : normalizeJsonRecord(
            ctx.input.context,
            'context',
            'odoo_execute_method_context_invalid'
          );

    let transport = ctx.auth.transport ?? 'jsonrpc';
    if (transport === 'json2' && args && args.length > 0) {
      throw invalidExecuteInput(
        'Odoo JSON-2 does not support positional args. Move every method parameter into kwargs using the parameter names shown on the Odoo instance `/doc` page.',
        'odoo_json2_named_arguments_required'
      );
    }
    if (transport === 'json2' && kwargs !== undefined && Object.hasOwn(kwargs, 'ids')) {
      throw invalidExecuteInput(
        'Odoo JSON-2 reserves `ids` for record selection. Remove kwargs.ids; use validated recordIds with invocationMode "records", or omit recordIds for a model-level call.',
        'odoo_json2_reserved_ids_argument'
      );
    }

    let namedArguments = mergeNamedArguments(kwargs, context);
    let result: unknown;
    try {
      let client = createClient(ctx);
      result =
        invocationMode === 'records'
          ? await client.callRecordMethod({
              model,
              method,
              ids: recordIds,
              arguments: namedArguments,
              legacyArguments: args,
              legacyKeywordArguments: namedArguments
            })
          : await client.callModelMethod({
              model,
              method,
              arguments: namedArguments,
              legacyArguments: args,
              legacyKeywordArguments: namedArguments
            });
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `executing ${model}.${method}`,
        reason: 'odoo_execute_method_failed'
      });
    }

    let normalizedResult = normalizeJsonValue(
      result,
      'Odoo method result',
      'odoo_execute_method_response_invalid'
    );
    return {
      output: { result: normalizedResult },
      message:
        invocationMode === 'records'
          ? `Executed public method \`${method}\` on **${recordIds.length}** \`${model}\` record(s).`
          : `Executed public model method \`${method}\` on \`${model}\`.`
    };
  })
  .build();
