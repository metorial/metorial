import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapScheduled } from '../lib/models';
import {
  budgetInput,
  dateInput,
  idInput,
  invalid,
  milliunits,
  nonempty,
  rejectFields,
  required,
  scheduledDate
} from '../lib/validation';
import { spec } from '../spec';

const frequency = z.enum([
  'never',
  'daily',
  'weekly',
  'everyOtherWeek',
  'twiceAMonth',
  'every4Weeks',
  'monthly',
  'everyOtherMonth',
  'everyThreeMonths',
  'everyFourMonths',
  'every3Months',
  'every4Months',
  'twiceAYear',
  'yearly',
  'everyOtherYear'
]);
const fields = [
  'accountId',
  'date',
  'amount',
  'frequency',
  'payeeId',
  'payeeName',
  'categoryId',
  'memo',
  'flagColor'
];
export const manageScheduledTransaction = SlateTool.create(spec, {
  name: 'Manage Scheduled Transaction',
  key: 'manage_scheduled_transaction',
  description:
    'Create, read, update, or delete a scheduled transaction. Partial updates read fresh details and preserve omitted fields. Dates use UTC and must be in the next five years. The API does not create scheduled splits; this tool protects existing split parts by requiring a non-split record for updates.',
  tags: { destructive: true }
})
  .input(
    z.object({
      budgetId: budgetInput,
      action: z.enum(['create', 'get', 'update', 'delete']),
      scheduledTransactionId: idInput.optional(),
      accountId: idInput.optional(),
      date: dateInput.optional(),
      amount: milliunits.optional(),
      frequency: frequency
        .optional()
        .describe('Legacy everyThreeMonths/everyFourMonths map to every3Months/every4Months.'),
      payeeId: idInput.nullable().optional(),
      payeeName: z.string().max(200).nullable().optional(),
      categoryId: idInput.nullable().optional(),
      memo: z.string().max(500).nullable().optional(),
      flagColor: z
        .enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple'])
        .nullable()
        .optional()
    })
  )
  .output(
    z.object({
      scheduledTransactionId: z.string(),
      dateFirst: z.string().optional(),
      dateNext: z.string().optional(),
      frequency: z.string().optional(),
      amount: milliunits.optional(),
      accountId: z.string().optional(),
      payeeId: z.string().nullable().optional(),
      payeeName: z.string().nullable().optional(),
      categoryId: z.string().nullable().optional(),
      categoryName: z.string().nullable().optional(),
      memo: z.string().nullable().optional(),
      flagColor: z.string().nullable().optional(),
      transferAccountId: z.string().nullable().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const budget = ctx.input.budgetId ?? ctx.config.budgetId;
    if (ctx.input.action === 'get' || ctx.input.action === 'delete') {
      rejectFields(ctx.input, fields, ctx.input.action);
      const id = required(ctx.input.scheduledTransactionId, 'Scheduled transaction ID');
      const result =
        ctx.input.action === 'get'
          ? await client.getScheduledTransaction(budget, id)
          : await client.deleteScheduledTransaction(budget, id);
      return {
        output: mapScheduled(result),
        message: `${ctx.input.action === 'get' ? 'Retrieved' : 'Confirmed deletion of'} scheduled transaction ${result.id}.`
      };
    }
    if (ctx.input.payeeId && ctx.input.payeeName != null)
      throw invalid('Provide payeeId or payeeName; the name would be ignored with an ID.');
    let body: Record<string, unknown> = {
      account_id: ctx.input.accountId,
      date: ctx.input.date,
      amount: ctx.input.amount,
      frequency:
        ctx.input.frequency === 'everyThreeMonths'
          ? 'every3Months'
          : ctx.input.frequency === 'everyFourMonths'
            ? 'every4Months'
            : ctx.input.frequency,
      payee_id: ctx.input.payeeId,
      payee_name: ctx.input.payeeName,
      category_id: ctx.input.categoryId,
      memo: ctx.input.memo,
      flag_color: ctx.input.flagColor
    };
    let result: Awaited<ReturnType<Client['getScheduledTransaction']>>;
    if (ctx.input.action === 'create') {
      rejectFields(ctx.input, ['scheduledTransactionId'], 'create');
      body.account_id = required(ctx.input.accountId, 'Account ID');
      body.date = scheduledDate(required(ctx.input.date, 'Date'));
      if (ctx.input.amount === undefined || ctx.input.frequency === undefined)
        throw invalid('amount and frequency are required for create.');
      result = await client.createScheduledTransaction(budget, body);
    } else {
      nonempty(body);
      const id = required(ctx.input.scheduledTransactionId, 'Scheduled transaction ID');
      const current = await client.getScheduledTransaction(budget, id);
      if (current.deleted || (current.subtransactions ?? []).some(s => !s.deleted))
        throw invalid(
          'This tool protects existing split parts; update an active, non-split schedule here or edit its split in the YNAB app.'
        );
      const preserved = {
        account_id: current.account_id,
        date: current.date_next,
        amount: current.amount,
        frequency: current.frequency,
        payee_id: current.payee_id,
        category_id: current.category_id,
        memo: current.memo,
        flag_color: current.flag_color
      };
      body = {
        ...preserved,
        ...Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined))
      };
      if (ctx.input.payeeName !== undefined && ctx.input.payeeId === undefined)
        body.payee_id = null;
      body.date = scheduledDate(required(body.date, 'Scheduled date'));
      result = await client.updateScheduledTransaction(budget, id, body);
    }
    if (
      result.deleted ||
      (ctx.input.action === 'update' && result.id !== ctx.input.scheduledTransactionId)
    )
      throw createApiServiceError(
        'YNAB did not confirm an active scheduled transaction for this request.',
        { reason: 'ynab_response' }
      );
    if (
      result.account_id !== body.account_id ||
      result.amount !== body.amount ||
      result.frequency !== body.frequency ||
      result.date_next !== body.date ||
      (body.payee_id !== undefined &&
        body.payee_name == null &&
        (result.payee_id ?? null) !== body.payee_id) ||
      (body.memo !== undefined && (result.memo ?? '') !== (body.memo ?? '')) ||
      (body.flag_color !== undefined && (result.flag_color ?? null) !== body.flag_color)
    )
      throw createApiServiceError(
        'YNAB did not confirm the requested scheduled fields. Read the schedule before retrying.',
        { reason: 'ynab_response' }
      );
    if (body.category_id !== undefined && result.category_id !== body.category_id)
      throw createApiServiceError(
        'YNAB did not apply the scheduled category. Credit Card Payment categories are unsupported.',
        { reason: 'ynab_response' }
      );
    return {
      output: mapScheduled(result),
      message: `${ctx.input.action === 'create' ? 'Created' : 'Updated'} scheduled transaction ${result.id}.`
    };
  })
  .build();
