import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import {
  integerAmount,
  invalid,
  nonemptyPatch,
  object,
  recordSchema,
  required
} from '../lib/validation';
import { spec } from '../spec';

export let manageSpendProgram = SlateTool.create(spec, {
  name: 'Manage Spend Program',
  key: 'manage_spend_program',
  description: `List, get, create, or update Ramp spend programs. Spend programs group funds, users, and cards under shared policies, acting as "blueprints" for consistent spending rules and automated fund provisioning.`,
  instructions: [
    "Amounts use the currency's minor units. No currency conversion is performed.",
    'The current API documents create/list/get. The retained legacy update route may not be available on every account.',
    'Creation requires displayName, description, icon, amount, interval and both permitted-spend flags. Nested update values are preserved from a readback rather than implicitly replaced.',
    "When a spend program is linked to a limit, it overrides the limit's spending restrictions"
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('Action to perform'),
      spendProgramId: z
        .string()
        .optional()
        .describe('Spend program ID (required for get, update)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      pageSize: z.number().min(2).max(100).optional().describe('Results per page (for list)'),
      displayName: z.string().optional().describe('Program display name'),
      description: z.string().optional().describe('Program description'),
      icon: z.string().optional().describe('Icon identifier (e.g. TeamSocialIcon)'),
      isShareable: z.boolean().optional().describe('Whether the program is shareable'),
      primaryCardEnabled: z
        .boolean()
        .optional()
        .describe('Whether primary card spending is enabled'),
      reimbursementsEnabled: z
        .boolean()
        .optional()
        .describe('Whether reimbursements are enabled'),
      amount: z.number().optional().describe('Spending limit amount in cents'),
      currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
      interval: z
        .string()
        .optional()
        .describe('Spending interval (e.g. DAILY, MONTHLY, ANNUAL, TOTAL)'),
      allowedCategories: z
        .array(z.number())
        .optional()
        .describe(
          'Allowed Ramp category codes; these are distinct from merchant category (MCC) codes.'
        )
    })
  )
  .output(
    z.object({
      spendProgram: recordSchema.optional().describe('Single spend program object'),
      spendPrograms: z
        .array(recordSchema)
        .optional()
        .describe('List of spend program objects'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listSpendPrograms({
        start: ctx.input.cursor,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          spendPrograms: result.data,
          nextCursor: result.page?.next
        },
        message: `Retrieved **${result.data.length}** spend programs${result.page?.next ? ' (more pages available)' : ''}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.spendProgramId)
        throw invalid('spendProgramId is required for get action');
      let spendProgram = await client.getSpendProgram(ctx.input.spendProgramId);
      return {
        output: { spendProgram },
        message: `Retrieved spend program **${spendProgram.display_name || ctx.input.spendProgramId}**.`
      };
    }

    let input = ctx.input;
    integerAmount(input.amount);
    let body: Record<string, unknown> = {};
    for (let [field, key] of [
      ['displayName', 'display_name'],
      ['description', 'description'],
      ['icon', 'icon'],
      ['isShareable', 'is_shareable']
    ] as const)
      if (input[field] !== undefined) body[key] = input[field];
    let nested =
      input.primaryCardEnabled !== undefined ||
      input.reimbursementsEnabled !== undefined ||
      input.amount !== undefined ||
      input.currencyCode !== undefined ||
      input.interval !== undefined ||
      input.allowedCategories !== undefined;
    let old =
      input.action === 'update' && nested
        ? await client.getSpendProgram(required(input.spendProgramId, 'spendProgramId'))
        : undefined;
    if (
      input.primaryCardEnabled !== undefined ||
      input.reimbursementsEnabled !== undefined ||
      input.action === 'create'
    ) {
      let before = old?.permitted_spend_types
        ? object(old.permitted_spend_types, 'existing spend methods')
        : {};
      let permissions = {
        primary_card_enabled: input.primaryCardEnabled ?? before.primary_card_enabled,
        reimbursements_enabled: input.reimbursementsEnabled ?? before.reimbursements_enabled
      };
      if (Object.values(permissions).some(value => typeof value !== 'boolean'))
        throw invalid(
          'Provide primaryCardEnabled and reimbursementsEnabled when no existing flags can be preserved.'
        );
      body.permitted_spend_types = permissions;
    }
    if (
      input.amount !== undefined ||
      input.currencyCode !== undefined ||
      input.interval !== undefined ||
      input.allowedCategories !== undefined ||
      input.action === 'create'
    ) {
      let before = old?.restrictions ? object(old.restrictions, 'existing restrictions') : {};
      let beforeLimit = before.limit ? object(before.limit, 'existing amount') : {};
      let amount = input.amount ?? beforeLimit.amount;
      if (typeof amount !== 'number')
        throw invalid('amount is required when no existing spending amount can be preserved.');
      integerAmount(amount);
      let interval = input.interval ?? before.interval;
      let currency = input.currencyCode ?? beforeLimit.currency_code;
      let restrictions: Record<string, unknown> = {};
      if (input.action === 'update') {
        for (let key of [
          'allowed_categories',
          'allowed_vendors',
          'blocked_categories',
          'blocked_vendors'
        ])
          if (before[key] !== undefined) restrictions[key] = before[key];
        if (
          before.transaction_amount_limit !== undefined &&
          before.transaction_amount_limit !== null
        ) {
          let limit = object(
            before.transaction_amount_limit,
            'existing per-transaction amount'
          );
          restrictions.transaction_amount_limit = {
            amount: limit.amount,
            currency_code: limit.currency_code
          };
        }
        if (before.auto_lock_date !== undefined)
          restrictions.lock_date = before.auto_lock_date;
      }
      restrictions.interval = required(interval, 'interval');
      restrictions.limit = {
        amount,
        ...(currency === undefined
          ? {}
          : { currency_code: required(currency, 'currencyCode') })
      };
      if (input.allowedCategories !== undefined)
        restrictions.allowed_categories = input.allowedCategories;
      body.spending_restrictions = restrictions;
    }
    if (input.action === 'create') {
      required(input.displayName, 'displayName');
      required(input.icon, 'icon');
      if (input.description === undefined)
        throw invalid('description is required for spend-program creation.');
      let spendProgram = await client.createSpendProgram(body);
      return {
        output: { spendProgram },
        message:
          'Ramp returned the created spend program. It may provision spending resources according to its policies.'
      };
    }
    required(input.spendProgramId, 'spendProgramId');
    nonemptyPatch(body);
    let spendProgram = await client.updateSpendProgram(
      required(input.spendProgramId, 'spendProgramId'),
      body
    );
    return {
      output: { spendProgram },
      message:
        'Ramp accepted the legacy spend-program update. Read the program to confirm its state.'
    };
  })
  .build();
