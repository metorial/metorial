import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import {
  integerAmount,
  invalid,
  nonemptyPatch,
  object,
  recordSchema,
  required,
  taskReceipt,
  unsupported
} from '../lib/validation';
import { spec } from '../spec';

export let manageLimit = SlateTool.create(spec, {
  name: 'Manage Limit',
  key: 'manage_limit',
  description: `List, get, create, update, or terminate a legacy spending limit or a current Ramp fund. Limits represent individual spending budgets that can be associated with cards and reimbursements.
- **list**: Retrieve limits, optionally filtered by spend program, user, or entity.
- **get**: Retrieve a specific limit by ID.
- **create**: Create a new spending limit with optional spend program linkage.
- **update**: Modify a limit's settings.
- **terminate**: Permanently terminate a limit.`,
  instructions: [
    'For current funds, a linked spend program supplies omitted defaults; explicit restrictions override those defaults.',
    "Amounts use the currency's minor units; no currency conversion is performed.",
    'Choose resource=fund for the documented current Funds API and supply fundId for exact fund actions. Legacy limitId values are never reinterpreted as fund IDs.',
    'Legacy routes are retained for existing connections; current public documentation does not establish their availability. New grants request current Funds scopes and do not supply legacy Limits scopes. Use resource=fund for a new connection; confirm a stored legacy grant before using legacy routes. Legacy deferred receipts are not completion.',
    'Terminating a fund is permanent and affects associated cards and members. permittedSpendTypes updates replace the full permission object after preserving omitted flags from readback.'
  ]
})
  .input(
    z.object({
      resource: z
        .enum(['legacy', 'fund'])
        .optional()
        .describe('Defaults to legacy for compatibility. Choose fund for the current API.'),
      fundId: z
        .string()
        .optional()
        .describe('Current fund ID, independent of the legacy limitId.'),
      permittedSpendTypes: z
        .object({
          physicalCard: z.boolean().optional(),
          virtualCard: z.boolean().optional(),
          reimbursements: z.boolean().optional()
        })
        .optional()
        .describe(
          'Fund spend methods. Standalone creation requires all three flags; update preserves omitted flags from a current readback.'
        ),
      isTerminated: z.boolean().optional().describe('Current fund list filter.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'terminate'])
        .describe('Action to perform'),
      limitId: z
        .string()
        .optional()
        .describe('Limit ID (required for get, update, terminate)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      pageSize: z.number().min(2).max(100).optional().describe('Results per page (for list)'),
      spendProgramId: z
        .string()
        .optional()
        .describe('Spend program ID (for list filter or create linkage)'),
      userId: z.string().optional().describe('User ID (for list filter or create assignment)'),
      entityId: z.string().optional().describe('Entity ID (for list filter)'),
      displayName: z.string().optional().describe('Display name for the limit'),
      amount: z.number().optional().describe('Spending limit amount in cents'),
      currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
      interval: z
        .string()
        .optional()
        .describe('Spending interval (e.g. DAILY, MONTHLY, ANNUAL, TOTAL)'),
      isShareable: z
        .boolean()
        .optional()
        .describe('Whether the limit is shareable among multiple users'),
      idempotencyKey: z.string().optional().describe('Idempotency key for create/terminate')
    })
  )
  .output(
    z.object({
      limit: recordSchema.optional().describe('Single limit object'),
      limits: z.array(recordSchema).optional().describe('List of limit objects'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);
    let input = ctx.input;
    let current = input.resource === 'fund';
    if (current && input.limitId !== undefined)
      throw invalid('For the current Funds API, use fundId and omit legacy limitId.');
    if (!current)
      unsupported(
        input,
        ['fundId', 'permittedSpendTypes', 'isTerminated'],
        'Legacy Limits API'
      );
    if (input.action === 'list') {
      let filters = {
        start: input.cursor,
        pageSize: input.pageSize,
        spendProgramId: input.spendProgramId,
        userId: input.userId,
        entityId: input.entityId
      };
      let page = current
        ? await client.listFunds({
            ...filters,
            displayName: input.displayName,
            isTerminated: input.isTerminated
          })
        : await client.listLimits(filters);
      return {
        output: { limits: page.data, nextCursor: page.page.next },
        message: `Retrieved ${page.data.length} ${current ? 'funds' : 'legacy limits'}.`
      };
    }
    let target = current ? input.fundId : input.limitId;
    if (input.action === 'get') {
      let limit = current
        ? await client.getFund(required(target, 'fundId'))
        : await client.getLimit(required(target, 'limitId'));
      return { output: { limit }, message: 'Retrieved the requested spending resource.' };
    }
    if (input.action === 'terminate') {
      unsupported(
        input,
        [
          'amount',
          'currencyCode',
          'interval',
          'displayName',
          'isShareable',
          'userId',
          'spendProgramId',
          'permittedSpendTypes'
        ],
        'Spending resource termination'
      );
      if (current) unsupported(input, ['idempotencyKey'], 'Current fund termination');
      let limit = current
        ? await client.terminateFund(required(target, 'fundId'))
        : await client.terminateLimit(
            required(target, 'limitId'),
            input.idempotencyKey === undefined
              ? crypto.randomUUID()
              : required(input.idempotencyKey, 'idempotencyKey')
          );
      if (!current) taskReceipt(limit);
      return {
        output: { limit },
        message: current
          ? 'Ramp returned the fund after termination. Verify its state and associated cards.'
          : 'Submitted legacy limit termination. The deferred receipt does not prove completion.'
      };
    }
    integerAmount(input.amount);
    if (input.currencyCode !== undefined) required(input.currencyCode, 'currencyCode');
    let body: Record<string, unknown> = {
      display_name: input.displayName,
      is_shareable: input.isShareable
    };
    if (input.displayName !== undefined) required(input.displayName, 'displayName');
    let restrictions: Record<string, unknown> = {};
    if (input.interval !== undefined)
      restrictions.interval = required(input.interval, 'interval');
    let existing: Record<string, unknown> | undefined;
    if (input.action === 'update') {
      required(target, current ? 'fundId' : 'limitId');
      unsupported(input, ['userId'], 'Spending resource update');
      if (!current)
        unsupported(
          input,
          ['isShareable', 'spendProgramId', 'idempotencyKey'],
          'Legacy limit update'
        );
      if (
        current &&
        (input.permittedSpendTypes ||
          (input.amount === undefined) !== (input.currencyCode === undefined))
      )
        existing = await client.getFund(required(target, 'fundId'));
    }
    if (input.amount !== undefined || input.currencyCode !== undefined) {
      let amount = input.amount;
      let currency = input.currencyCode;
      if (
        current &&
        input.action === 'update' &&
        (amount === undefined || currency === undefined)
      ) {
        let old = object(
          object(existing?.spending_restrictions, 'existing restrictions').limit,
          'existing fund limit'
        );
        if (amount === undefined) {
          if (typeof old.amount !== 'number')
            throw invalid(
              'The current fund has no amount to preserve; supply amount and currencyCode.'
            );
          amount = old.amount;
        }
        if (currency === undefined) {
          if (typeof old.currency_code !== 'string')
            throw invalid(
              'The current fund has no currency to preserve; supply amount and currencyCode.'
            );
          currency = old.currency_code;
        }
      }
      if (amount === undefined)
        throw invalid('amount is required when currencyCode is supplied.');
      integerAmount(amount);
      restrictions.limit = { amount, currency_code: currency };
    }
    if (Object.keys(restrictions).length) body.spending_restrictions = restrictions;
    if (current) {
      if (
        input.action === 'create' &&
        body.spending_restrictions &&
        (!('limit' in restrictions) || !input.interval)
      )
        throw invalid(
          'Fund creation requires amount and interval together when spending restrictions are supplied. Omit both to inherit a spend program.'
        );
      if (input.spendProgramId !== undefined)
        body.spend_program_id = required(input.spendProgramId, 'spendProgramId');
      if (input.permittedSpendTypes) {
        let old =
          input.action === 'update'
            ? object(existing?.permitted_spend_types, 'existing fund spend methods')
            : {};
        let permissions = {
          physical_card: input.permittedSpendTypes.physicalCard ?? old.physical_card_enabled,
          virtual_card: input.permittedSpendTypes.virtualCard ?? old.virtual_card_enabled,
          reimbursements:
            input.permittedSpendTypes.reimbursements ?? old.reimbursements_enabled
        };
        if (Object.values(permissions).some(flag => typeof flag !== 'boolean'))
          throw invalid(
            'Provide all fund spend-method flags when no existing values are available.'
          );
        body.permitted_spend_types = permissions;
      }
      if (input.action === 'create') {
        body.user_id = required(input.userId, 'userId');
        if (!input.spendProgramId) {
          required(input.displayName, 'displayName');
          if (
            !body.spending_restrictions ||
            !('limit' in restrictions) ||
            !input.interval ||
            !body.permitted_spend_types
          )
            throw invalid(
              'Standalone funds require amount, interval, displayName and all permittedSpendTypes flags, or select spendProgramId to inherit documented defaults.'
            );
        }
      }
      let key = input.idempotencyKey;
      if (key !== undefined && required(key, 'idempotencyKey').length > 255)
        throw invalid('idempotencyKey must not exceed 255 characters.');
      if (input.action === 'update') nonemptyPatch(body);
      let limit =
        input.action === 'create'
          ? await client.createFund(body, key)
          : await client.updateFund(required(target, 'fundId'), body, key);
      return {
        output: { limit },
        message: 'Ramp returned the fund. Read it to confirm the requested state.'
      };
    }
    if (input.action === 'create') {
      body.user_id = required(input.userId, 'userId');
      if (input.spendProgramId !== undefined)
        body.spend_program_id = required(input.spendProgramId, 'spendProgramId');
      body.idempotency_key =
        input.idempotencyKey === undefined
          ? crypto.randomUUID()
          : required(input.idempotencyKey, 'idempotencyKey');
      let limit = await client.createLimit(body);
      taskReceipt(limit);
      return {
        output: { limit },
        message:
          'Submitted the legacy limit creation task. Read the resulting resource before claiming completion.'
      };
    }
    nonemptyPatch(body);
    let limit = await client.updateLimit(required(target, 'limitId'), body);
    return {
      output: { limit },
      message: 'Ramp accepted the legacy limit update. Read the resource to confirm its state.'
    };
  })
  .build();
