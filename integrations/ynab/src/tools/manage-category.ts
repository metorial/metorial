import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapCategory } from '../lib/models';
import {
  budgetInput,
  date,
  idInput,
  invalid,
  milliunits,
  nonempty,
  rejectFields,
  required
} from '../lib/validation';
import { spec } from '../spec';

const metadata = [
  'name',
  'note',
  'categoryGroupId',
  'goalType',
  'goalTarget',
  'goalTargetDate',
  'goalDay',
  'goalFrequency',
  'goalNeedsWholeAmount'
];
export const manageCategory = SlateTool.create(spec, {
  name: 'Manage Category',
  key: 'manage_category',
  description:
    'Create or update a category, or set its assigned amount for a month. Amounts are integer milliunits. Targets use supported target amount, date, cadence, and rollover fields; legacy goalType and goalDay writes are rejected because YNAB does not accept them.',
  instructions: [
    'Create requires categoryGroupId and name.',
    'Update requires categoryId and at least one supported field.',
    'Assign requires categoryId, month, and budgeted; it does not change category metadata.',
    'Set goalTarget to null to remove an existing target. Loan categories only accept the target amount; credit-card targets do not accept cadence or rollover options.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      budgetId: budgetInput,
      action: z.enum(['create', 'update', 'assign']),
      categoryId: idInput.optional(),
      categoryGroupId: idInput.optional(),
      name: z.string().trim().min(1).optional(),
      note: z.string().nullable().optional(),
      goalType: z
        .enum(['TB', 'TBD', 'MF', 'NEED', 'DEBT'])
        .nullable()
        .optional()
        .describe(
          'Legacy input retained for compatibility; unsupported by current writes. Use goalTarget, goalTargetDate, goalFrequency, or the YNAB app.'
        ),
      goalTarget: milliunits.nonnegative().nullable().optional(),
      goalTargetDate: z
        .string()
        .nullable()
        .optional()
        .describe('UTC date, sent as goal_target_date. Null clears a supported target date.'),
      goalDay: milliunits
        .nullable()
        .optional()
        .describe('Legacy input retained; set the due day in the YNAB app.'),
      goalFrequency: z
        .enum(['monthly', 'weekly', 'yearly'])
        .optional()
        .describe(
          'Requires a non-null goalTarget and cannot accompany goalTargetDate; replaces the target with a recurring NEED target.'
        ),
      goalNeedsWholeAmount: z
        .boolean()
        .nullable()
        .optional()
        .describe('Supported only for NEED targets on ordinary categories.'),
      month: z.string().optional(),
      budgeted: milliunits.optional()
    })
  )
  .output(
    z.object({
      categoryId: z.string(),
      name: z.string(),
      budgeted: milliunits.optional(),
      activity: milliunits.optional(),
      balance: milliunits.optional(),
      goalNeedsWholeAmount: z.boolean().nullable().optional(),
      goalCadence: milliunits.nullable().optional(),
      goalType: z.string().nullable().optional(),
      goalTarget: milliunits.nullable().optional(),
      goalTargetDate: z.string().nullable().optional(),
      goalPercentageComplete: milliunits.nullable().optional(),
      internal: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const budget = ctx.input.budgetId ?? ctx.config.budgetId;
    if (ctx.input.goalType !== undefined || ctx.input.goalDay !== undefined)
      throw invalid(
        'YNAB does not accept goalType or goalDay writes. Use goalTarget, goalTargetDate, or goalFrequency; remove a target with goalTarget=null, or edit its due day/type in the app.'
      );
    if (
      ctx.input.goalFrequency !== undefined &&
      (ctx.input.goalTarget == null || ctx.input.goalTargetDate !== undefined)
    )
      throw invalid(
        'goalFrequency requires a non-null goalTarget and cannot accompany goalTargetDate.'
      );
    if (typeof ctx.input.goalTargetDate === 'string') date(ctx.input.goalTargetDate);
    if (
      ctx.input.goalTarget === null &&
      (ctx.input.goalTargetDate !== undefined ||
        ctx.input.goalFrequency !== undefined ||
        ctx.input.goalNeedsWholeAmount !== undefined)
    )
      throw invalid('Use goalTarget=null alone to remove the target.');
    let category: Awaited<ReturnType<Client['getCategory']>>;
    if (ctx.input.action === 'assign') {
      rejectFields(ctx.input, metadata, 'assign');
      if (ctx.input.budgeted === undefined) throw invalid('budgeted is required for assign.');
      const id = required(ctx.input.categoryId, 'Category ID');
      category = await client.updateMonthCategory(
        budget,
        required(ctx.input.month, 'Month'),
        id,
        ctx.input.budgeted
      );
    } else {
      rejectFields(ctx.input, ['month', 'budgeted'], ctx.input.action);
      const body = {
        name: ctx.input.name,
        note: ctx.input.note,
        category_group_id: ctx.input.categoryGroupId,
        goal_target: ctx.input.goalTarget,
        goal_target_date: ctx.input.goalTargetDate,
        goal_frequency: ctx.input.goalFrequency,
        goal_needs_whole_amount: ctx.input.goalNeedsWholeAmount
      };
      nonempty(body);
      if (ctx.input.action === 'create') {
        rejectFields(ctx.input, ['categoryId'], 'create');
        const groupId = required(ctx.input.categoryGroupId, 'Category group ID');
        required(ctx.input.name, 'Category name');
        const group = (await client.getCategories(budget)).categoryGroups.find(
          g => g.id === groupId
        );
        if (!group || group.deleted || group.internal)
          throw invalid('Create categories only in an active, user-created group.');
        if (
          ctx.input.goalTarget == null &&
          (ctx.input.goalTargetDate !== undefined ||
            ctx.input.goalNeedsWholeAmount !== undefined)
        )
          throw invalid('A new target date or rollover option requires goalTarget.');
        if (ctx.input.goalTarget === null)
          throw invalid(
            'A new category has no target to remove; omit goalTarget or provide an amount.'
          );
        category = await client.createCategory(budget, body);
      } else {
        const id = required(ctx.input.categoryId, 'Category ID');
        const current = await client.getCategory(budget, id);
        if (current.deleted) throw invalid('Deleted categories cannot be updated.');
        const groups = (await client.getCategories(budget)).categoryGroups;
        if (
          ctx.input.goalTargetDate !== undefined &&
          current.goal_target == null &&
          ctx.input.goalTarget == null
        )
          throw invalid(
            'A target date requires an existing target or a new goalTarget amount.'
          );
        if (ctx.input.categoryGroupId !== undefined) {
          const destination = groups.find(g => g.id === ctx.input.categoryGroupId);
          if (!destination || destination.deleted || destination.internal || current.internal)
            throw invalid(
              'Only user-created categories can move to active, user-created groups.'
            );
        }
        if (
          current.goal_type === 'DEBT' &&
          (ctx.input.goalTargetDate !== undefined ||
            ctx.input.goalFrequency !== undefined ||
            ctx.input.goalNeedsWholeAmount !== undefined)
        )
          throw invalid(
            'Loan-paired categories support goalTarget for the monthly payment, but not target date, frequency, or rollover options.'
          );
        if (
          ctx.input.goalFrequency !== undefined ||
          ctx.input.goalNeedsWholeAmount !== undefined
        ) {
          const group = groups.find(g => g.id === current.category_group_id);
          if (!group || group.internal || current.internal)
            throw invalid(
              'Frequency and rollover options are unavailable for internal or credit-card payment categories.'
            );
          if (
            ctx.input.goalNeedsWholeAmount !== undefined &&
            ctx.input.goalFrequency === undefined &&
            current.goal_type !== 'NEED' &&
            !(current.goal_type == null && ctx.input.goalTarget != null)
          )
            throw invalid(
              'Rollover options require a NEED target, or a new ordinary target amount.'
            );
        }
        category = await client.updateCategory(budget, id, body);
      }
    }
    if (ctx.input.action !== 'create' && category.id !== ctx.input.categoryId)
      throw createApiServiceError(
        'YNAB returned another category instead of confirming this update.',
        { reason: 'ynab_response' }
      );
    if (ctx.input.budgeted !== undefined && category.budgeted !== ctx.input.budgeted)
      throw createApiServiceError('YNAB did not confirm the requested assigned amount.', {
        reason: 'ynab_response'
      });
    if (ctx.input.goalTarget !== undefined && category.goal_target !== ctx.input.goalTarget)
      throw createApiServiceError(
        'YNAB did not confirm the requested target amount or removal. Read the category before retrying.',
        { reason: 'ynab_response' }
      );
    if (
      ctx.input.goalTargetDate !== undefined &&
      category.goal_target_date !== ctx.input.goalTargetDate
    )
      throw createApiServiceError(
        'YNAB did not confirm the requested target date. Check special category restrictions.',
        { reason: 'ynab_response' }
      );
    if (
      ctx.input.goalFrequency !== undefined &&
      category.goal_cadence !== { monthly: 1, weekly: 2, yearly: 13 }[ctx.input.goalFrequency]
    )
      throw createApiServiceError('YNAB did not confirm the requested target frequency.', {
        reason: 'ynab_response'
      });
    if (
      typeof ctx.input.goalNeedsWholeAmount === 'boolean' &&
      category.goal_needs_whole_amount !== ctx.input.goalNeedsWholeAmount
    )
      throw createApiServiceError(
        'YNAB did not confirm the requested target rollover option.',
        { reason: 'ynab_response' }
      );
    return {
      output: mapCategory(category),
      message: `${ctx.input.action === 'create' ? 'Created' : ctx.input.action === 'update' ? 'Updated' : 'Assigned amount to'} category ${category.id}.`
    };
  })
  .build();
