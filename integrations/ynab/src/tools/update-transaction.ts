import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  budgetInput,
  idInput,
  invalid,
  milliunits,
  nonempty,
  splitSum
} from '../lib/validation';
import { spec } from '../spec';
import { transactionBody, transactionFields } from './create-transaction';
export const updateTransaction = SlateTool.create(spec, {
  name: 'Update Transaction',
  key: 'update_transaction',
  description:
    'Update supplied transaction fields, or convert a non-split transaction into a split. Existing split parts cannot be replaced. YNAB ignores changes to a split parent’s date, amount, or category; these changes are rejected.',
  tags: { destructive: false }
})
  .input(z.object({ budgetId: budgetInput, transactionId: idInput, ...transactionFields }))
  .output(
    z.object({
      transactionId: z.string(),
      date: z.string(),
      amount: milliunits,
      accountId: z.string(),
      payeeName: z.string().nullable().optional(),
      categoryName: z.string().nullable().optional(),
      cleared: z.string(),
      approved: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const budget = ctx.input.budgetId ?? ctx.config.budgetId;
    const body = transactionBody(ctx.input);
    nonempty(body);
    if (ctx.input.payeeName !== undefined && ctx.input.payeeId === undefined)
      body.payee_id = null;
    if (ctx.input.payeeId && ctx.input.payeeName != null)
      throw invalid(
        'Provide payeeId or payeeName; the name would be ignored when an ID is supplied.'
      );
    const current = await client.getTransaction(budget, ctx.input.transactionId);
    if (current.deleted) throw invalid('A deleted transaction cannot be updated.');
    const existingSplit = (current.subtransactions ?? []).some(s => !s.deleted);
    if (
      existingSplit &&
      (ctx.input.subtransactions !== undefined ||
        ctx.input.date !== undefined ||
        ctx.input.amount !== undefined ||
        ctx.input.categoryId !== undefined)
    )
      throw invalid(
        'YNAB does not support replacing existing split parts or changing the split parent date, amount, or category. Edit the split in the YNAB app.'
      );
    if (ctx.input.subtransactions) {
      if (ctx.input.categoryId != null)
        throw invalid('Omit categoryId when providing split parts.');
      for (const s of ctx.input.subtransactions)
        if (s.payeeId && s.payeeName !== undefined)
          throw invalid('Provide payeeId or payeeName for each split part.');
      splitSum(ctx.input.subtransactions, ctx.input.amount ?? current.amount);
    }
    const t = await client.updateTransaction(budget, ctx.input.transactionId, body);
    if (t.id !== ctx.input.transactionId || t.deleted)
      throw createApiServiceError(
        'YNAB did not confirm an active update for this transaction.',
        { reason: 'ynab_response' }
      );
    if (
      (ctx.input.amount !== undefined && t.amount !== ctx.input.amount) ||
      (ctx.input.date !== undefined && t.date !== ctx.input.date) ||
      (ctx.input.accountId !== undefined && t.account_id !== ctx.input.accountId) ||
      (ctx.input.cleared !== undefined && t.cleared !== ctx.input.cleared) ||
      (ctx.input.approved !== undefined && t.approved !== ctx.input.approved) ||
      (body.payee_id !== undefined &&
        ctx.input.payeeName == null &&
        (t.payee_id ?? null) !== body.payee_id) ||
      (ctx.input.memo !== undefined && (t.memo ?? '') !== (ctx.input.memo ?? '')) ||
      (ctx.input.flagColor !== undefined && (t.flag_color ?? null) !== ctx.input.flagColor)
    )
      throw createApiServiceError(
        'YNAB did not confirm the requested transaction fields. Read it before retrying.',
        { reason: 'ynab_response' }
      );
    if (
      ctx.input.categoryId !== undefined &&
      !ctx.input.subtransactions &&
      t.category_id !== ctx.input.categoryId
    )
      throw createApiServiceError(
        'YNAB did not apply the requested category. Credit Card Payment categories cannot categorize transactions.',
        { reason: 'ynab_response' }
      );
    if (ctx.input.subtransactions) {
      if (
        !t.subtransactions ||
        t.subtransactions.filter(s => !s.deleted).length !== ctx.input.subtransactions.length
      )
        throw createApiServiceError('YNAB did not confirm the requested split conversion.', {
          reason: 'ynab_response'
        });
      splitSum(
        t.subtransactions.filter(s => !s.deleted),
        t.amount
      );
    }
    return {
      output: {
        transactionId: t.id,
        date: t.date,
        amount: t.amount,
        accountId: t.account_id,
        payeeName: t.payee_name,
        categoryName: t.category_name,
        cleared: t.cleared,
        approved: t.approved
      },
      message: `Updated transaction ${t.id}.`
    };
  })
  .build();
