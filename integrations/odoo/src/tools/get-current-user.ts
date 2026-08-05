import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let USER_FIELDS = [
  'name',
  'login',
  'email',
  'company_id',
  'company_ids',
  'lang',
  'tz',
  'active'
] as const;

type JsonRecord = Record<string, unknown>;
type Company = { companyId?: number; companyName?: string };

let isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let invalidResponse = (detail: string) =>
  createApiServiceError(`Odoo returned invalid current-user data: ${detail}.`, {
    reason: 'odoo_current_user_response_invalid'
  });

let positiveInteger = (value: unknown, label: string) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw invalidResponse(`${label} must be a positive integer`);
  }

  return value;
};

let optionalText = (value: unknown, label: string) => {
  if (value === undefined || value === null || value === false) return undefined;
  if (typeof value !== 'string') throw invalidResponse(`${label} must be text when present`);

  let normalized = value.trim();
  return normalized === '' ? undefined : normalized;
};

let optionalBoolean = (value: unknown, label: string) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean')
    throw invalidResponse(`${label} must be boolean when present`);
  return value;
};

let company = (value: unknown): Company => {
  if (value === undefined || value === null || value === false) return {};
  if (typeof value === 'number') return { companyId: positiveInteger(value, 'company ID') };
  if (!Array.isArray(value) || value.length !== 2) {
    throw invalidResponse('company must be an ID or an ID and name pair');
  }

  let companyId = positiveInteger(value[0], 'company ID');
  let companyName = optionalText(value[1], 'company name');
  return { companyId, ...(companyName ? { companyName } : {}) };
};

let companyIds = (value: unknown, fallbackId?: number) => {
  if (value === undefined || value === null || value === false) {
    return fallbackId === undefined ? [] : [fallbackId];
  }
  if (!Array.isArray(value)) throw invalidResponse('company IDs must be an array');

  let normalized = value.map(id => positiveInteger(id, 'company ID'));
  return [...new Set(normalized)];
};

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated Odoo user, including identity, locale, default company, and accessible company IDs. Use this to verify the connected account and understand its company context.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context for this lookup, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      userId: z.number().int().positive().describe('Authenticated Odoo user ID'),
      name: z.string().optional().describe('User display name'),
      login: z.string().optional().describe('User login'),
      email: z.string().optional().describe('User email address'),
      companyId: z.number().int().positive().optional().describe('Default company ID'),
      companyName: z.string().optional().describe('Default company display name'),
      companyIds: z
        .array(z.number().int().positive())
        .describe('Company IDs accessible to the user'),
      language: z.string().optional().describe('User language code'),
      timezone: z.string().optional().describe('User timezone'),
      active: z.boolean().optional().describe('Whether the user is active')
    })
  )
  .handleInvocation(async ctx => {
    try {
      let client = createClient(ctx);
      let context: JsonRecord = {};
      let userId = ctx.auth.uid;

      if (ctx.auth.transport === 'json2') {
        let contextResult = await client.callModelMethod({
          model: 'res.users',
          method: 'context_get',
          arguments: ctx.input.context ? { context: ctx.input.context } : {}
        });
        if (!isRecord(contextResult)) throw invalidResponse('user context must be an object');

        context = contextResult;
        userId = positiveInteger(context.uid, 'context user ID');
      } else {
        userId = positiveInteger(userId, 'authenticated user ID');
      }

      let readArguments: Record<string, unknown> = {
        fields: [...USER_FIELDS],
        load: null
      };
      if (ctx.input.context) readArguments.context = ctx.input.context;

      let readResult = await client.callRecordMethod({
        model: 'res.users',
        method: 'read',
        ids: [userId],
        arguments: readArguments,
        legacyKeywordArguments: readArguments
      });
      if (!Array.isArray(readResult) || readResult.length !== 1 || !isRecord(readResult[0])) {
        throw invalidResponse('the user read must return exactly one record');
      }

      let user = readResult[0];
      if (positiveInteger(user.id, 'returned user ID') !== userId) {
        throw invalidResponse('the returned user ID does not match the authenticated user');
      }

      let defaultCompany = company(user.company_id);
      let name = optionalText(user.name, 'name');
      let login = optionalText(user.login, 'login');
      let email = optionalText(user.email, 'email');
      let language =
        optionalText(user.lang, 'language') ?? optionalText(context.lang, 'language');
      let timezone = optionalText(user.tz, 'timezone') ?? optionalText(context.tz, 'timezone');
      let active = optionalBoolean(user.active, 'active status');

      let output = {
        userId,
        ...(name ? { name } : {}),
        ...(login ? { login } : {}),
        ...(email ? { email } : {}),
        ...defaultCompany,
        companyIds: companyIds(user.company_ids, defaultCompany.companyId),
        ...(language ? { language } : {}),
        ...(timezone ? { timezone } : {}),
        ...(active === undefined ? {} : { active })
      };

      return {
        output,
        message: name
          ? `Authenticated as **${name}** (user #${userId}).`
          : `Authenticated as Odoo user **#${userId}**.`
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: 'retrieving the current user',
        reason: 'odoo_get_current_user_failed'
      });
    }
  })
  .build();
