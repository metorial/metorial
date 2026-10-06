import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { budgetId, mapBudget } from '../lib/schemas';
import { dateOnly, fail, integerAmount, keyedMutation, required } from '../lib/validation';
import { spec } from '../spec';

export let manageBudget = SlateTool.create(spec, {
  name: 'Manage Budget',
  key: 'manage_budget',
  description: `Create, update, or archive a budget in Brex. Budgets track planned spend; spend limits enforce member controls. Select resourceType explicitly for spend limits. Archiving disables spending and retains history.
To create a budget, omit **budgetId**. To update, provide **budgetId**. To archive, set **archive** to true.`,
  instructions: [
    'To create a budget, omit budgetId and provide name and limit details.',
    'To update, provide budgetId and only the fields to change.',
    'Archiving a budget removes it from the UI and disables its spend limits. This cannot be undone.'
  ]
})
  .input(
    z.object({
      resourceType: z
        .enum(['budget', 'spend_limit'])
        .optional()
        .describe(
          'Defaults to budget. memberUserIds and spendLimitSettings require spend_limit.'
        ),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Stable key for create/update. Omission generates one key per invocation, never automatic retries.'
        ),
      spendLimitSettings: z
        .object({
          authorizationType: z.enum(['HARD', 'SOFT']).optional(),
          rolloverRefreshRate: z
            .enum(['OFF', 'NEVER', 'PER_MONTH', 'PER_QUARTER', 'PER_YEAR'])
            .optional(),
          expenseVisibility: z.enum(['SHARED', 'PRIVATE']).optional(),
          authorizationVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
          limitIncreaseSetting: z.enum(['ENABLED', 'DISABLED']).optional(),
          spendType: z
            .enum(['BUDGET_PROVISIONED_CARDS_ONLY', 'NON_BUDGET_PROVISIONED_CARDS_ALLOWED'])
            .optional(),
          autoTransferCardsSetting: z.enum(['DISABLED', 'ENABLED']).optional(),
          autoCreateLimitCardsSetting: z.enum(['DISABLED', 'ALL_MEMBERS']).optional(),
          expensePolicyId: z.string().optional()
        })
        .optional()
        .describe(
          'Explicit settings for spend limits. Every field is required for spend-limit creation; updates may provide a subset. Never assume policy or visibility defaults.'
        ),
      budgetId: z
        .string()
        .optional()
        .describe('ID of an existing budget to update or archive. Omit to create.'),
      archive: z.boolean().optional().describe('Set to true to archive the budget'),
      name: z.string().optional().describe('Name of the budget'),
      description: z.string().optional().describe('Description of the budget'),
      parentBudgetId: z.string().optional().describe('Parent budget ID for nested budgets'),
      ownerUserIds: z.array(z.string()).optional().describe('User IDs of the budget owners'),
      memberUserIds: z.array(z.string()).optional().describe('User IDs of the budget members'),
      periodType: z
        .enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'])
        .optional()
        .describe('Budget period type'),
      limit: z
        .object({
          amount: z.number().describe('Limit amount in cents'),
          currency: z.string().optional().describe('Currency code (defaults to USD)')
        })
        .optional()
        .describe('Spend limit for the budget'),
      startDate: z.string().optional().describe('Start date for the budget period (ISO 8601)'),
      endDate: z.string().optional().describe('End date for the budget period (ISO 8601)')
    })
  )
  .output(
    z.object({
      budgetId: z.string().describe('ID of the budget'),
      name: z.string().nullable().optional().describe('Budget name'),
      status: z.string().nullish().describe('Budget status'),
      archived: z.boolean().optional().describe('Whether the budget was archived'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Exact key retained in receipt/error metadata for safe retries.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.budgetId !== undefined) required(ctx.input.budgetId, 'budgetId');
    const type = ctx.input.resourceType ?? 'budget';
    if (
      type === 'budget' &&
      (ctx.input.memberUserIds !== undefined || ctx.input.spendLimitSettings !== undefined)
    )
      fail(
        'memberUserIds and spendLimitSettings require resourceType spend_limit. Budgets do not enforce member limits.'
      );
    if (ctx.input.archive && !ctx.input.budgetId) fail('budgetId is required for archiving.');
    dateOnly(ctx.input.startDate, 'startDate');
    dateOnly(ctx.input.endDate, 'endDate');
    if (ctx.input.startDate && ctx.input.endDate && ctx.input.endDate < ctx.input.startDate)
      fail('endDate must not precede startDate.');
    const client = new Client({ token: ctx.auth.token });
    if (ctx.input.archive) {
      if (
        [
          ctx.input.name,
          ctx.input.description,
          ctx.input.parentBudgetId,
          ctx.input.ownerUserIds,
          ctx.input.memberUserIds,
          ctx.input.periodType,
          ctx.input.limit,
          ctx.input.startDate,
          ctx.input.endDate,
          ctx.input.spendLimitSettings
        ].some(v => v !== undefined)
      )
        fail('Archiving cannot be combined with updates.');
      await client.getBudget(ctx.input.budgetId!, type);
      await client.archiveBudget(ctx.input.budgetId!, type);
      const current = await client.getBudget(ctx.input.budgetId!, type);
      if ((current.spend_budget_status ?? current.status) !== 'ARCHIVED')
        fail('Brex did not confirm the archived state. Do not repeat creation.');
      return {
        output: { budgetId: ctx.input.budgetId!, archived: true, status: 'ARCHIVED' },
        message:
          'Spending resource archived; history remains and child limits may be disabled.'
      };
    }
    const period = ctx.input.periodType;
    const recurrence =
      type === 'spend_limit' && period && period !== 'ONE_TIME'
        ? ({ MONTHLY: 'PER_MONTH', QUARTERLY: 'PER_QUARTER', YEARLY: 'PER_YEAR' } as const)[
            period
          ]
        : period;
    const amount = ctx.input.limit ? integerAmount(ctx.input.limit) : undefined;
    const settings = ctx.input.spendLimitSettings;
    if (type === 'spend_limit' && ctx.input.budgetId && ctx.input.parentBudgetId !== undefined)
      fail('The current spend-limit update contract cannot change parentBudgetId.');
    const data: Record<string, unknown> = {
      name: ctx.input.name,
      description: ctx.input.description,
      owner_user_ids: ctx.input.ownerUserIds,
      period_recurrence_type: recurrence,
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate
    };
    if (type === 'budget' || !ctx.input.budgetId)
      data.parent_budget_id = ctx.input.parentBudgetId;
    if (type === 'budget') data.amount = amount;
    else {
      data.member_user_ids = ctx.input.memberUserIds;
      if (amount || settings?.authorizationType || settings?.rolloverRefreshRate)
        data.authorization_settings = {
          base_limit: amount,
          authorization_type: settings?.authorizationType,
          rollover_refresh_rate: settings?.rolloverRefreshRate
        };
      if (settings)
        Object.assign(data, {
          expense_visibility: settings.expenseVisibility,
          authorization_visibility: settings.authorizationVisibility,
          limit_increase_setting: settings.limitIncreaseSetting,
          spend_type: settings.spendType,
          auto_transfer_cards_setting: settings.autoTransferCardsSetting,
          auto_create_limit_cards_setting: settings.autoCreateLimitCardsSetting,
          expense_policy_id: settings.expensePolicyId
        });
    }
    if (!ctx.input.budgetId) {
      required(ctx.input.name, 'name');
      required(ctx.input.periodType, 'periodType');
      if (!amount) fail('limit is required for creation.');
      if (type === 'budget') {
        required(ctx.input.description, 'description');
        required(ctx.input.parentBudgetId, 'parentBudgetId');
      } else {
        const fields = [
          'authorizationType',
          'rolloverRefreshRate',
          'expenseVisibility',
          'authorizationVisibility',
          'limitIncreaseSetting',
          'spendType',
          'autoTransferCardsSetting',
          'autoCreateLimitCardsSetting',
          'expensePolicyId'
        ] as const;
        for (const field of fields) required(settings?.[field], `spendLimitSettings.${field}`);
      }
    } else if (Object.values(data).every(v => v === undefined))
      fail('Provide at least one supported field to update.');
    const receipt = await keyedMutation(
      ctx.input.idempotencyKey,
      [ctx.auth.token, ctx.auth.refreshToken],
      async key => {
        const value = ctx.input.budgetId
          ? await client.updateBudget(ctx.input.budgetId, data, key, type)
          : await client.createBudget(data, key, type);
        if (ctx.input.budgetId && budgetId(value) !== ctx.input.budgetId)
          fail('Brex returned a different spending resource.');
        return value;
      }
    );
    const value = receipt.value;
    return {
      output: { ...mapBudget(value), archived: false, idempotencyKey: receipt.idempotencyKey },
      message:
        'Spending resource saved. Reuse the same idempotency key after an ambiguous result; budgets track spend and spend limits enforce controls.'
    };
  })
  .build();
